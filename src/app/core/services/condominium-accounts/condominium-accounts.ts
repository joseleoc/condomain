import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import {
  CondominiumAccount,
  CreateCondominiumAccountData,
} from '@app-types/condominium-accounts';
import { NetworkStatusService } from '../network-status.service';
import { LocalRepository } from '../sync/local-repository';
import { SyncService } from '../sync/sync-service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { TelemetryEvents } from '../telemetry/telemetry.types';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject } from 'rxjs';

export interface UpdateCondominiumAccountData {
  name?: string;
  account_type?: 'bank' | 'cash' | 'wallet' | 'credit' | 'investment';
  currency?: string;
  institution_name?: string | null;
  initial_balance?: number;
  current_balance?: number;
  icon?: string | null;
  color?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CondominiumAccounts {
  // --- Dependencies ---
  private client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);
  #syncService = inject(SyncService);
  #telemetry = inject(TelemetryService);

  // --- State ---
  accounts$ = new BehaviorSubject<CondominiumAccount[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<unknown>(null);

  // --- Methods ---

  /**
   * Fetch all wallets for a condominium.
   * 
   * Online: queries Supabase and caches locally in IndexedDB.
   * Offline: reads from IndexedDB cache filtered by condominium_id.
   * 
   * @param condominiumId - The condominium ID to fetch wallets for
   * @returns Array of CondominiumAccount sorted by name (ascending)
   * @throws Error if Supabase query fails
   */
  async fetchByCondominium(condominiumId: string): Promise<CondominiumAccount[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType('account');
        const accounts = entities
          .map((e) => e.data as unknown as CondominiumAccount)
          .filter((a) => a.condominium_id === condominiumId);

        this.accounts$.next(accounts);
        return accounts;
      }

      const { data, error } = await this.client
        .from('condominium_accounts')
        .select('*')
        .eq('condominium_id', condominiumId)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) throw error;

      // Cache each account locally
      for (const account of data || []) {
        await this.#localRepo.upsert('account', account);
      }

      this.accounts$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Fetch a single wallet by ID.
   * 
   * Online: queries Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   * 
   * @param id - The wallet ID to fetch
   * @returns CondominiumAccount if found, null otherwise
   * @throws Error if Supabase query fails (except PGRST116 - no rows)
   */
  async getById(id: string): Promise<CondominiumAccount | null> {
    if (!this.#networkStatus.isOnline()) {
      const cached = await this.#localRepo.getById('account', id);
      return (cached as CondominiumAccount | undefined) ?? null;
    }

    const { data, error } = await this.client
      .from('condominium_accounts')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    await this.#localRepo.upsert('account', data);
    return data;
  }

  /**
   * Create a new wallet.
   * 
   * Online: inserts into Supabase, caches locally in IndexedDB, tracks telemetry event.
   * Offline: generates a local UUID, creates local record with _local_status='pending',
   *          queues mutation for sync when online.
   * 
   * @param data - Wallet creation data (condominium_id, name, account_type, currency, etc.)
   * @returns Created CondominiumAccount
   * @throws Error if Supabase insert fails
   */
  async create(data: CreateCondominiumAccountData): Promise<CondominiumAccount> {
    if (this.#networkStatus.isOnline()) {
      return this.#createOnline(data);
    }
    return this.#createOffline(data);
  }

  /**
   * Update an existing wallet.
   * 
   * Online: performs optimistic local update, then updates Supabase.
   *         Reverts local update if Supabase fails.
   * Offline: performs optimistic local update, queues mutation for sync.
   * 
   * @param id - The wallet ID to update
   * @param data - Partial wallet data to update (only provided fields will be updated)
   * @throws Error if Supabase update fails (local changes reverted)
   */
  async update(id: string, data: UpdateCondominiumAccountData): Promise<void> {
    // Optimistic local update
    const existing = await this.#localRepo.getById('account', id);
    if (existing) {
      const updated = {
        ...existing,
        ...(data.name !== undefined && { name: data.name }),
        ...(data.account_type !== undefined && { account_type: data.account_type }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.institution_name !== undefined && {
          institution_name: data.institution_name,
        }),
        ...(data.initial_balance !== undefined && {
          initial_balance: data.initial_balance,
        }),
        ...(data.current_balance !== undefined && {
          current_balance: data.current_balance,
        }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.color !== undefined && { color: data.color }),
        updated_at: new Date().toISOString(),
      };
      await this.#localRepo.upsert('account', updated);
    }

    if (this.#networkStatus.isOnline()) {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) updateData['name'] = data.name;
      if (data.account_type !== undefined)
        updateData['account_type'] = data.account_type;
      if (data.currency !== undefined) updateData['currency'] = data.currency;
      if (data.institution_name !== undefined)
        updateData['institution_name'] = data.institution_name;
      if (data.initial_balance !== undefined)
        updateData['initial_balance'] = data.initial_balance;
      if (data.current_balance !== undefined)
        updateData['current_balance'] = data.current_balance;
      if (data.icon !== undefined) updateData['icon'] = data.icon;
      if (data.color !== undefined) updateData['color'] = data.color;

      const { error } = await this.client
        .from('condominium_accounts')
        .update(updateData)
        .eq('id', id);

      if (error) {
        // Revert optimistic update on failure
        if (existing) {
          await this.#localRepo.upsert('account', existing);
        }
        throw error;
      }
    } else {
      await this.#syncService.enqueueMutation(
        'update',
        'account',
        id,
        data as unknown as Record<string, unknown>,
        `update-account-${id}-${Date.now()}`,
      );
    }
  }

  /**
   * Soft-delete a wallet.
   * 
   * Online: performs optimistic local update (sets deleted_at), then calls
   *         RPC function soft_delete_account on Supabase. Reverts if RPC fails.
   * Offline: performs optimistic local update, queues mutation for sync.
   * 
   * @param id - The wallet ID to delete
   * @throws Error if Supabase RPC fails (local changes reverted)
   */
  async delete(id: string): Promise<void> {
    // Optimistic local update
    const existing = await this.#localRepo.getById('account', id);
    if (existing) {
      await this.#localRepo.upsert('account', {
        ...existing,
        deleted_at: new Date().toISOString(),
      });
    }

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.client.rpc('soft_delete_account', {
        p_id: id,
        p_reversal_reason: 'Deleted by user',
      });

      if (error) {
        // Revert optimistic update on failure
        if (existing) {
          await this.#localRepo.upsert('account', existing);
        }
        throw error;
      }
    } else {
      await this.#syncService.enqueueMutation(
        'delete',
        'account',
        id,
        { id },
        `delete-account-${id}-${Date.now()}`,
      );
    }
  }

  // --- Private Methods ---

  async #createOnline(data: CreateCondominiumAccountData): Promise<CondominiumAccount> {
    const valuesToInsert = {
      ...data,
      institution_name: data.institution_name ?? null,
      initial_balance: data.initial_balance ?? 0,
      current_balance: data.initial_balance ?? 0,
      icon: data.icon ?? null,
      color: data.color ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await this.client
      .from('condominium_accounts')
      .insert(valuesToInsert)
      .select()
      .single();

    if (error) throw error;

    // Cache locally
    await this.#localRepo.upsert('account', result);

    this.#telemetry.track(TelemetryEvents.FINANCIAL_WALLET_CREATED, {
      account_id: result.id,
      condominium_id: result.condominium_id,
      account_type: result.account_type,
    });

    const accounts = [...this.accounts$.getValue(), result].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    this.accounts$.next(accounts);

    return result;
  }

  async #createOffline(
    data: CreateCondominiumAccountData,
  ): Promise<CondominiumAccount & { _local_status: 'pending' }> {
    const id = uuidv4();
    const account: CondominiumAccount = {
      id,
      ...data,
      institution_name: data.institution_name ?? null,
      initial_balance: data.initial_balance ?? 0,
      current_balance: data.initial_balance ?? 0,
      icon: data.icon ?? null,
      color: data.color ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    // Cache locally immediately
    await this.#localRepo.upsert('account', {
      ...account,
      _local_status: 'pending' as const,
    });

    // Queue creation for sync
    await this.#syncService.enqueueMutation(
      'create',
      'account',
      account.id,
      {
        ...data,
        created_at: account.created_at,
        updated_at: account.updated_at,
      },
      `create-account-${account.id}-${Date.now()}`,
    );

    this.#telemetry.track(TelemetryEvents.FINANCIAL_WALLET_CREATED, {
      account_id: account.id,
      condominium_id: account.condominium_id,
      account_type: account.account_type,
    });

    const accounts = [...this.accounts$.getValue(), account].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    this.accounts$.next(accounts);

    return { ...account, _local_status: 'pending' as const };
  }
}
