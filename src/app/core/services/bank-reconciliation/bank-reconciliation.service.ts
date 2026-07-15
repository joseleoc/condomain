import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Supabase } from '@core/services/supabase/supabase';
import { NetworkStatusService } from '@core/services/network-status/network-status.service';
import { LocalRepository } from '@core/services/sync/local-repository';
import { SyncService } from '@core/services/sync/sync-service';
import { Profile } from '@core/services/profile/profile';
import type {
  BankReconciliation,
  BankReconciliationItem,
  CreateBankReconciliationData,
  CreateReconciliationItemData,
} from '@app-types/exchange-rates-reconciliation';

const RECONCILIATION_ENTITY_TYPE = 'bank_reconciliation';
const ITEM_ENTITY_TYPE = 'bank_reconciliation_item';

@Injectable({ providedIn: 'root' })
export class BankReconciliationService {
  #client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);
  #syncService = inject(SyncService);
  #profile = inject(Profile);

  reconciliations$ = new BehaviorSubject<BankReconciliation[]>([]);
  items$ = new BehaviorSubject<BankReconciliationItem[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<unknown>(null);

  /**
   * Fetch bank reconciliations for a condominium.
   * 
   * Online: queries Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   * 
   * @param condominiumId - The condominium ID
   * @param accountId - Optional account ID filter
   * @param status - Optional status filter
   * @returns Array of BankReconciliation sorted by statement_date (newest first)
   * @throws Error if Supabase query fails
   */
  async fetchByCondominium(
    condominiumId: string,
    accountId?: string,
    status?: string,
  ): Promise<BankReconciliation[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType(RECONCILIATION_ENTITY_TYPE);
        const reconciliations = entities
          .map((e) => e.data as unknown as BankReconciliation)
          .filter((r) => r.condominium_id === condominiumId)
          .filter((r) => !accountId || r.account_id === accountId)
          .filter((r) => !status || r.status === status)
          .sort((a, b) => b.statement_date.localeCompare(a.statement_date));

        this.reconciliations$.next(reconciliations);
        return reconciliations;
      }

      let query = this.#client
        .from('bank_reconciliations')
        .select('*')
        .eq('condominium_id', condominiumId)
        .order('statement_date', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cache locally
      for (const reconciliation of data || []) {
        await this.#localRepo.upsert(RECONCILIATION_ENTITY_TYPE, reconciliation);
      }

      this.reconciliations$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Fetch items for a specific reconciliation.
   * 
   * Online: queries Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   * 
   * @param reconciliationId - The reconciliation ID
   * @returns Array of BankReconciliationItem
   * @throws Error if Supabase query fails
   */
  async fetchItems(reconciliationId: string): Promise<BankReconciliationItem[]> {
    const { data, error } = await this.#client
      .from('bank_reconciliation_items')
      .select('*')
      .eq('reconciliation_id', reconciliationId)
      .order('statement_date', { ascending: true });

    if (error) throw error;

    // Cache locally
    for (const item of data || []) {
      await this.#localRepo.upsert(ITEM_ENTITY_TYPE, item);
    }

    this.items$.next(data || []);
    return data || [];
  }

  /**
   * Create a new bank reconciliation.
   * 
   * Online: inserts into Supabase and caches locally.
   * Offline: creates local record and queues mutation for sync.
   * 
   * @param data - Reconciliation creation data
   * @returns Created BankReconciliation
   * @throws Error if Supabase insert fails
   */
  async create(data: CreateBankReconciliationData): Promise<BankReconciliation> {
    const profileId = this.#getCurrentProfileId();
    const now = new Date().toISOString();

    const reconciliation: BankReconciliation = {
      id: crypto.randomUUID(),
      ...data,
      reconciled_balance: 0,
      difference: 0,
      status: 'pending',
      reconciled_by: null,
      reconciled_at: null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    // Cache locally
    await this.#localRepo.upsert(RECONCILIATION_ENTITY_TYPE, reconciliation);

    if (this.#networkStatus.isOnline()) {
      const { data: result, error } = await this.#client
        .from('bank_reconciliations')
        .insert({
          condominium_id: data.condominium_id,
          account_id: data.account_id,
          statement_date: data.statement_date,
          statement_balance: data.statement_balance,
          notes: data.notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      await this.#localRepo.upsert(RECONCILIATION_ENTITY_TYPE, result);
      this.reconciliations$.next([...this.reconciliations$.value, result]);
      return result;
    }

    // Queue for sync
    await this.#syncService.enqueueMutation(
      'create',
      RECONCILIATION_ENTITY_TYPE,
      reconciliation.id,
      {
        ...data,
        created_at: now,
        updated_at: now,
      },
      `create-${RECONCILIATION_ENTITY_TYPE}-${reconciliation.id}-${Date.now()}`,
    );

    this.reconciliations$.next([...this.reconciliations$.value, reconciliation]);
    return reconciliation;
  }

  /**
   * Add an item to a bank reconciliation.
   * 
   * Online: inserts into Supabase and caches locally.
   * Offline: creates local record and queues mutation for sync.
   * 
   * @param data - Item creation data
   * @returns Created BankReconciliationItem
   * @throws Error if Supabase insert fails
   */
  async addItem(data: CreateReconciliationItemData): Promise<BankReconciliationItem> {
    const now = new Date().toISOString();

    const item: BankReconciliationItem = {
      id: crypto.randomUUID(),
      ...data,
      match_status: 'unmatched',
      notes: data.notes ?? null,
      created_at: now,
    };

    // Cache locally
    await this.#localRepo.upsert(ITEM_ENTITY_TYPE, item);

    if (this.#networkStatus.isOnline()) {
      const { data: result, error } = await this.#client
        .from('bank_reconciliation_items')
        .insert({
          reconciliation_id: data.reconciliation_id,
          transaction_id: data.transaction_id ?? null,
          statement_reference: data.statement_reference ?? null,
          statement_date: data.statement_date ?? null,
          statement_amount: data.statement_amount ?? null,
          notes: data.notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      await this.#localRepo.upsert(ITEM_ENTITY_TYPE, result);
      this.items$.next([...this.items$.value, result]);
      return result;
    }

    // Queue for sync
    await this.#syncService.enqueueMutation(
      'create',
      ITEM_ENTITY_TYPE,
      item.id,
      {
        ...data,
        created_at: now,
      },
      `create-${ITEM_ENTITY_TYPE}-${item.id}-${Date.now()}`,
    );

    this.items$.next([...this.items$.value, item]);
    return item;
  }

  /**
   * Update a reconciliation item's match status.
   * 
   * Online: updates in Supabase with optimistic local update.
   * Offline: updates local cache and queues mutation for sync.
   * 
   * @param itemId - The item ID
   * @param matchStatus - New match status
   * @param transactionId - Optional transaction ID to link
   * @throws Error if Supabase update fails
   */
  async updateItemMatchStatus(
    itemId: string,
    matchStatus: 'unmatched' | 'matched' | 'cleared' | 'exception',
    transactionId?: string,
  ): Promise<void> {
    const existing = await this.#localRepo.getById(ITEM_ENTITY_TYPE, itemId);
    if (!existing) throw new Error('Reconciliation item not found');

    const updated = {
      ...existing,
      match_status: matchStatus,
      transaction_id: transactionId ?? (existing as any).transaction_id,
    };

    await this.#localRepo.upsert(ITEM_ENTITY_TYPE, updated);

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.#client
        .from('bank_reconciliation_items')
        .update({
          match_status: matchStatus,
          transaction_id: transactionId ?? (existing as any).transaction_id,
        })
        .eq('id', itemId);

      if (error) throw error;
    } else {
      await this.#syncService.enqueueMutation(
        'update',
        ITEM_ENTITY_TYPE,
        itemId,
        {
          match_status: matchStatus,
          transaction_id: transactionId ?? (existing as any).transaction_id,
        },
        `update-${ITEM_ENTITY_TYPE}-${itemId}-${Date.now()}`,
      );
    }

    this.items$.next(this.items$.value.map((i) => (i.id === itemId ? updated : i)));
  }

  /**
   * Complete a bank reconciliation.
   * 
   * Calculates the reconciled balance and difference, then marks as completed.
   * 
   * @param reconciliationId - The reconciliation ID
   * @throws Error if reconciliation not found
   * @throws Error if Supabase update fails
   */
  async completeReconciliation(reconciliationId: string): Promise<void> {
    const existing = await this.#localRepo.getById(RECONCILIATION_ENTITY_TYPE, reconciliationId);
    if (!existing) throw new Error('Reconciliation not found');

    const reconciliation = existing as unknown as BankReconciliation;

    // Fetch all items for this reconciliation
    const items = await this.fetchItems(reconciliationId);

    // Calculate reconciled balance from matched/cleared items
    const reconciledBalance = items
      .filter((i) => i.match_status === 'matched' || i.match_status === 'cleared')
      .reduce((sum, i) => sum + (i.statement_amount ?? 0), 0);

    const difference = reconciliation.statement_balance - reconciledBalance;
    const profileId = this.#getCurrentProfileId();
    const now = new Date().toISOString();

    const updated = {
      ...reconciliation,
      reconciled_balance: reconciledBalance,
      difference,
      status: 'completed' as const,
      reconciled_by: profileId,
      reconciled_at: now,
      updated_at: now,
    };

    await this.#localRepo.upsert(RECONCILIATION_ENTITY_TYPE, updated);

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.#client
        .from('bank_reconciliations')
        .update({
          reconciled_balance: reconciledBalance,
          difference,
          status: 'completed',
          reconciled_by: profileId,
          reconciled_at: now,
          updated_at: now,
        })
        .eq('id', reconciliationId);

      if (error) throw error;
    }

    this.reconciliations$.next(
      this.reconciliations$.value.map((r) => (r.id === reconciliationId ? updated : r)),
    );
  }

  #getCurrentProfileId(): string {
    const profile = this.#profile.profile$.getValue();
    if (!profile) {
      throw new Error('No profile loaded; cannot determine reconciled_by');
    }
    return profile.id;
  }
}
