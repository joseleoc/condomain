import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import {
  CreateFinancialTransactionData,
  CreateTransferData,
  FinancialTransaction,
  TransactionFilter,
  TransactionStatus,
  TransactionType,
  UpdateFinancialTransactionData,
} from '@app-types/financial-transactions';
import { NetworkStatusService } from '../network-status/network-status.service';
import { LocalRepository } from '../sync/local-repository';
import { SyncService } from '../sync/sync-service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { TelemetryEvents } from '../telemetry/telemetry.types';
import { Profile } from '../profile/profile';
import { ContextService } from '../context/context.service';
import { FinancialEventsService } from '../financial-events/financial-events.service';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject } from 'rxjs';

const ENTITY_TYPE = 'financial_transaction' as const;

const VALID_STATUS_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  pending: ['completed', 'voided'],
  completed: ['voided'],
  voided: [],
};

@Injectable({
  providedIn: 'root',
})
export class FinancialTransactions {
  // --- Dependencies ---
  private client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);
  #syncService = inject(SyncService);
  #telemetry = inject(TelemetryService);
  #profile = inject(Profile);
  #context = inject(ContextService);
  #financialEvents = inject(FinancialEventsService);

  // --- State ---
  transactions$ = new BehaviorSubject<FinancialTransaction[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<unknown>(null);

  // --- Methods ---

  /**
   * Fetch transactions for a condominium with optional filters.
   * Online: fetches from Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   */
  async fetchByCondominium(
    condominiumId: string,
    filters: TransactionFilter = {},
  ): Promise<FinancialTransaction[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType(ENTITY_TYPE);
        const transactions = entities
          .map((e) => e.data as unknown as FinancialTransaction)
          .filter((t) => t.condominium_id === condominiumId)
          .filter((t) => this.#matchesFilters(t, filters))
          .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));

        this.transactions$.next(transactions);
        return transactions;
      }

      let query = this.client
        .from('financial_transactions')
        .select('*')
        .eq('condominium_id', condominiumId)
        .is('deleted_at', null);

      if (filters.account_id) {
        query = query.eq('account_id', filters.account_id);
      }
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.date_from) {
        query = query.gte('transaction_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('transaction_date', filters.date_to);
      }

      query = query.order('transaction_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      for (const transaction of data || []) {
        await this.#localRepo.upsert(ENTITY_TYPE, transaction);
      }

      this.transactions$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Fetch transactions for a specific account.
   * Online: fetches from Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   */
  async fetchByAccount(accountId: string): Promise<FinancialTransaction[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType(ENTITY_TYPE);
        const transactions = entities
          .map((e) => e.data as unknown as FinancialTransaction)
          .filter((t) => t.account_id === accountId)
          .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));

        this.transactions$.next(transactions);
        return transactions;
      }

      const { data, error } = await this.client
        .from('financial_transactions')
        .select('*')
        .eq('account_id', accountId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      for (const transaction of data || []) {
        await this.#localRepo.upsert(ENTITY_TYPE, transaction);
      }

      this.transactions$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Fetch transactions for a specific category.
   * Online: fetches from Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   */
  async fetchByCategory(categoryId: string): Promise<FinancialTransaction[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType(ENTITY_TYPE);
        const transactions = entities
          .map((e) => e.data as unknown as FinancialTransaction)
          .filter((t) => t.category_id === categoryId)
          .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));

        this.transactions$.next(transactions);
        return transactions;
      }

      const { data, error } = await this.client
        .from('financial_transactions')
        .select('*')
        .eq('category_id', categoryId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      for (const transaction of data || []) {
        await this.#localRepo.upsert(ENTITY_TYPE, transaction);
      }

      this.transactions$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Fetch a single transaction by ID.
   * Online: fetches from Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   */
  async getById(id: string): Promise<FinancialTransaction | null> {
    if (!this.#networkStatus.isOnline()) {
      const cached = await this.#localRepo.getById(ENTITY_TYPE, id);
      return (cached as FinancialTransaction | undefined) ?? null;
    }

    const { data, error } = await this.client
      .from('financial_transactions')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    await this.#localRepo.upsert(ENTITY_TYPE, data);
    return data;
  }

  /**
   * Create a new income/expense/transfer transaction.
   * Online: inserts into Supabase, caches locally, tracks telemetry.
   * Offline: generates a local UUID, queues a mutation for sync.
   * Emits 'transaction:created' event after successful creation.
   */
  async create(data: CreateFinancialTransactionData): Promise<FinancialTransaction> {
    let result: FinancialTransaction;
    
    if (this.#networkStatus.isOnline()) {
      result = await this.#createOnline(data);
    } else {
      result = await this.#createOffline(data);
    }
    
    // Emit event for other services to react (e.g., refresh wallet balances)
    this.#financialEvents.emit({
      type: 'transaction:created',
      condominiumId: data.condominium_id,
      accountId: data.account_id,
      transactionId: result.id,
      timestamp: new Date(),
    });
    
    return result;
  }

  /**
   * Create a transfer as two linked transactions.
   * Emits 'transaction:created' events for both legs after successful creation.
   */
  async createTransfer(data: CreateTransferData): Promise<FinancialTransaction[]> {
    if (data.amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }
    if (data.source_account_id === data.destination_account_id) {
      throw new Error('Source and destination accounts must be different');
    }

    const transferGroupId = uuidv4();
    const exchangeRate = data.exchange_rate ?? 1;
    const baseAmount = this.#calculateBaseAmount(data.amount, exchangeRate);
    const baseCurrency = data.base_currency ?? this.#getBaseCurrency(data.condominium_id);

    const common = {
      condominium_id: data.condominium_id,
      amount: data.amount,
      original_currency: data.original_currency,
      exchange_rate: exchangeRate,
      base_amount: baseAmount,
      base_currency: baseCurrency,
      description: data.description,
      transaction_date: data.transaction_date,
      transfer_group_id: transferGroupId,
    };

    const expenseLegData: CreateFinancialTransactionData = {
      ...common,
      account_id: data.source_account_id,
      category_id: null,
      type: 'expense',
    };

    const incomeLegData: CreateFinancialTransactionData = {
      ...common,
      account_id: data.destination_account_id,
      category_id: null,
      type: 'income',
    };

    let result: FinancialTransaction[];
    
    if (this.#networkStatus.isOnline()) {
      const expenseLeg = await this.#createOnline(expenseLegData, true);
      let incomeLeg: FinancialTransaction;
      try {
        incomeLeg = await this.#createOnline(incomeLegData, true);
      } catch (error) {
        // Leg 1 may already be persisted; transfer_group_id enables Phase 3 reconciliation
        console.error('Failed to create transfer income leg:', error);
        throw error;
      }
      result = [expenseLeg, incomeLeg];
    } else {
      const expenseLeg = await this.#createOffline(expenseLegData, true);
      const incomeLeg = await this.#createOffline(incomeLegData, true);
      result = [expenseLeg, incomeLeg];
    }
    
    // Emit events for both legs
    this.#financialEvents.emit({
      type: 'transaction:created',
      condominiumId: data.condominium_id,
      accountId: data.source_account_id,
      transactionId: result[0].id,
      timestamp: new Date(),
    });
    this.#financialEvents.emit({
      type: 'transaction:created',
      condominiumId: data.condominium_id,
      accountId: data.destination_account_id,
      transactionId: result[1].id,
      timestamp: new Date(),
    });
    
    return result;
  }

  /**
   * Update a transaction. Rejects edits to completed or voided transactions.
   */
  async update(id: string, data: UpdateFinancialTransactionData): Promise<void> {
    const existing = await this.#localRepo.getById(ENTITY_TYPE, id);
    const existingTransaction = existing
      ? (existing as unknown as FinancialTransaction)
      : undefined;

    if (existingTransaction && ['completed', 'voided'].includes(existingTransaction.status)) {
      throw new Error('Cannot edit completed or voided transactions');
    }

    if (existing) {
      const updated = {
        ...existing,
        ...(data.account_id !== undefined && { account_id: data.account_id }),
        ...(data.category_id !== undefined && { category_id: data.category_id }),
        ...(data.amount !== undefined && {
          amount: data.amount,
          base_amount: this.#calculateBaseAmount(
            data.amount,
            (data.exchange_rate ?? existing['exchange_rate'] ?? 1) as number,
          ),
        }),
        ...(data.original_currency !== undefined && {
          original_currency: data.original_currency,
        }),
        ...(data.base_currency !== undefined && { base_currency: data.base_currency }),
        ...(data.exchange_rate !== undefined && {
          exchange_rate: data.exchange_rate,
          base_amount: this.#calculateBaseAmount(
            (data.amount ?? existing['amount'] ?? 0) as number,
            data.exchange_rate,
          ),
        }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.reference_number !== undefined && {
          reference_number: data.reference_number,
        }),
        ...(data.transaction_date !== undefined && {
          transaction_date: data.transaction_date,
        }),
        updated_at: new Date().toISOString(),
      };
      await this.#localRepo.upsert(ENTITY_TYPE, updated);
    }

    if (this.#networkStatus.isOnline()) {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.account_id !== undefined) updateData['account_id'] = data.account_id;
      if (data.category_id !== undefined) updateData['category_id'] = data.category_id;
      if (data.amount !== undefined) {
        updateData['amount'] = data.amount;
        updateData['base_amount'] = this.#calculateBaseAmount(
          data.amount,
          data.exchange_rate ?? (existing?.['exchange_rate'] as number) ?? 1,
        );
      }
      if (data.original_currency !== undefined)
        updateData['original_currency'] = data.original_currency;
      if (data.base_currency !== undefined) updateData['base_currency'] = data.base_currency;
      if (data.exchange_rate !== undefined) {
        updateData['exchange_rate'] = data.exchange_rate;
        updateData['base_amount'] = this.#calculateBaseAmount(
          (data.amount ?? (existing?.['amount'] as number) ?? 0) as number,
          data.exchange_rate,
        );
      }
      if (data.description !== undefined) updateData['description'] = data.description;
      if (data.reference_number !== undefined)
        updateData['reference_number'] = data.reference_number;
      if (data.transaction_date !== undefined)
        updateData['transaction_date'] = data.transaction_date;

      const { error } = await this.client
        .from('financial_transactions')
        .update(updateData)
        .eq('id', id);

      if (error) {
        if (existing) {
          await this.#localRepo.upsert(ENTITY_TYPE, existing);
        }
        throw error;
      }
    } else {
      await this.#syncService.enqueueMutation(
        'update',
        ENTITY_TYPE,
        id,
        data as unknown as Record<string, unknown>,
        `update-financial_transaction-${id}-${Date.now()}`,
      );
    }
  }

  /**
   * Update only the status of a transaction, validating the transition.
   * Emits 'transaction:status-changed' event after successful update.
   */
  async updateStatus(id: string, newStatus: TransactionStatus): Promise<void> {
    const existing = await this.#localRepo.getById(ENTITY_TYPE, id);
    const existingTransaction = existing
      ? (existing as unknown as FinancialTransaction)
      : undefined;

    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    if (!VALID_STATUS_TRANSITIONS[existingTransaction.status].includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${existingTransaction.status} -> ${newStatus}`,
      );
    }

    await this.#localRepo.upsert(ENTITY_TYPE, {
      ...existing,
      status: newStatus,
      updated_at: new Date().toISOString(),
    });

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.client
        .from('financial_transactions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        if (existing) {
          await this.#localRepo.upsert(ENTITY_TYPE, existing);
        }
        throw error;
      }
    } else {
      await this.#syncService.enqueueMutation(
        'update',
        ENTITY_TYPE,
        id,
        { status: newStatus },
        `update-status-financial_transaction-${id}-${Date.now()}`,
      );
    }
    
    // Emit event for other services to react (e.g., refresh wallet balances when status changes to 'completed')
    this.#financialEvents.emit({
      type: 'transaction:status-changed',
      condominiumId: existingTransaction.condominium_id,
      accountId: existingTransaction.account_id,
      transactionId: id,
      timestamp: new Date(),
    });
  }

  /**
   * Soft-delete a transaction.
   * Online: calls RPC function to update deleted_at on Supabase.
   * Offline: updates local cache and queues mutation for sync.
   */
  async delete(id: string): Promise<void> {
    const existing = await this.#localRepo.getById(ENTITY_TYPE, id);
    if (existing) {
      await this.#localRepo.upsert(ENTITY_TYPE, {
        ...existing,
        deleted_at: new Date().toISOString(),
      });
    }

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.client.rpc('soft_delete_transaction', {
        p_id: id,
        p_reversal_reason: 'Deleted by user',
      });

      if (error) {
        if (existing) {
          await this.#localRepo.upsert(ENTITY_TYPE, existing);
        }
        throw error;
      }
    } else {
      await this.#syncService.enqueueMutation(
        'delete',
        ENTITY_TYPE,
        id,
        { id },
        `delete-financial_transaction-${id}-${Date.now()}`,
      );
    }
  }

  // --- Private Methods ---

  async #createOnline(
    data: CreateFinancialTransactionData,
    isTransferLeg = false,
  ): Promise<FinancialTransaction> {
    console.log('Creating transaction online:', data);
    const createdBy = this.#currentProfileId();
    const exchangeRate = data.exchange_rate ?? 1;
    const baseAmount = this.#calculateBaseAmount(data.amount, exchangeRate);
    const baseCurrency = data.base_currency ?? this.#getBaseCurrency(data.condominium_id);

    const valuesToInsert = {
      ...data,
      category_id: data.category_id ?? null,
      transfer_group_id: data.transfer_group_id ?? null,
      reference_number: data.reference_number ?? null,
      status: 'pending' as TransactionStatus,
      exchange_rate: exchangeRate,
      base_amount: baseAmount,
      base_currency: baseCurrency,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await this.client
      .from('financial_transactions')
      .insert(valuesToInsert)
      .select()
      .single();

    if (error) throw error;

    await this.#localRepo.upsert(ENTITY_TYPE, result);

    // Accounting entries are generated automatically by Postgres trigger
    // (see supabase/migrations/20260703000004_accounting_engine_trigger.sql)

    this.#telemetry.track(TelemetryEvents.FINANCIAL_TRANSACTION_CREATED, {
      transaction_type: data.type,
      amount: data.amount,
      currency: data.original_currency,
      condominium_id: data.condominium_id,
      is_transfer: isTransferLeg || data.type === 'transfer',
      has_exchange_rate: exchangeRate !== 1,
    });

    return result;
  }

  async #createOffline(
    data: CreateFinancialTransactionData,
    isTransferLeg = false,
  ): Promise<FinancialTransaction & { _local_status: 'pending' }> {
    const id = uuidv4();
    const createdBy = this.#currentProfileId();
    const exchangeRate = data.exchange_rate ?? 1;
    const baseAmount = this.#calculateBaseAmount(data.amount, exchangeRate);
    const baseCurrency = data.base_currency ?? this.#getBaseCurrency(data.condominium_id);

    const transaction: FinancialTransaction = {
      id,
      condominium_id: data.condominium_id,
      account_id: data.account_id,
      category_id: data.category_id ?? null,
      transfer_group_id: data.transfer_group_id ?? null,
      type: data.type,
      status: 'pending',
      amount: data.amount,
      original_currency: data.original_currency,
      exchange_rate: exchangeRate,
      base_amount: baseAmount,
      base_currency: baseCurrency,
      description: data.description,
      reference_number: data.reference_number ?? null,
      transaction_date: data.transaction_date,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      approved_at: null,
      approved_by: null,
      reconciled_at: null,
      reconciled_by: null,
      reversal_transaction_id: null,
      reversed_by_transaction_id: null,
      reversal_reason: null,
    };

    await this.#localRepo.upsert(ENTITY_TYPE, {
      ...transaction,
      _local_status: 'pending' as const,
    });

    await this.#syncService.enqueueMutation(
      'create',
      ENTITY_TYPE,
      transaction.id,
      {
        ...data,
        status: 'pending',
        exchange_rate: exchangeRate,
        base_amount: baseAmount,
        created_by: createdBy,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
      },
      `create-financial_transaction-${transaction.id}-${Date.now()}`,
    );

    this.#telemetry.track(TelemetryEvents.FINANCIAL_TRANSACTION_CREATED, {
      transaction_type: data.type,
      amount: data.amount,
      currency: data.original_currency,
      condominium_id: data.condominium_id,
      is_transfer: isTransferLeg || data.type === 'transfer',
      has_exchange_rate: exchangeRate !== 1,
    });

    return { ...transaction, _local_status: 'pending' as const };
  }

  #calculateBaseAmount(amount: number, exchangeRate: number): number {
    return Math.round(amount * exchangeRate * 100) / 100;
  }

  #getBaseCurrency(condominiumId: string): string {
    const condo = this.#context.activeCondominium();
    if (condo && condo.id === condominiumId && condo.currency) {
      return condo.currency;
    }
    // Fallback: query from database
    // This should rarely happen as ContextService should have the condo loaded
    return 'USD';
  }

  #currentProfileId(): string {
    const profile = this.#profile.profile$.getValue();
    if (!profile) {
      throw new Error('No profile loaded; cannot determine created_by');
    }
    return profile.id;
  }

  #matchesFilters(
    transaction: FinancialTransaction,
    filters: TransactionFilter,
  ): boolean {
    if (filters.account_id && transaction.account_id !== filters.account_id) {
      return false;
    }
    if (filters.category_id && transaction.category_id !== filters.category_id) {
      return false;
    }
    if (filters.type && transaction.type !== filters.type) {
      return false;
    }
    if (filters.status && transaction.status !== filters.status) {
      return false;
    }
    if (filters.date_from && transaction.transaction_date < filters.date_from) {
      return false;
    }
    if (filters.date_to && transaction.transaction_date > filters.date_to) {
      return false;
    }
    return true;
  }
}
