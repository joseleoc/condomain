import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import {
  FinancialTransaction,
  TransactionType,
} from '@app-types/financial-transactions';
import { NetworkStatusService } from '../network-status/network-status.service';
import { LocalRepository } from '../sync/local-repository';
import { SyncService } from '../sync/sync-service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { TelemetryEvents } from '../telemetry/telemetry.types';
import { Profile } from '../profile/profile';
import { ContextService } from '../context/context.service';
import { CondominiumAccounts } from '../condominium-accounts/condominium-accounts';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject } from 'rxjs';

const ENTITY_TYPE = 'financial_transaction' as const;

export interface CreateIncomeData {
  condominium_id: string;
  account_id: string;
  category_id: string;
  amount: number;
  original_currency: string;
  exchange_rate?: number;
  description: string;
  reference_number?: string | null;
  transaction_date: string;
}

@Injectable({
  providedIn: 'root',
})
export class IncomesService {
  // --- Dependencies ---
  private client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);
  #syncService = inject(SyncService);
  #telemetry = inject(TelemetryService);
  #profile = inject(Profile);
  #context = inject(ContextService);
  #accounts = inject(CondominiumAccounts);

  // --- State ---
  incomes$ = new BehaviorSubject<FinancialTransaction[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<unknown>(null);

  // --- Methods ---

  /**
   * Create a new income transaction with status='completed'.
   * After creation, refreshes the wallet cache to reflect the updated balance.
   * 
   * Online: inserts into Supabase with status='completed', caches locally, tracks telemetry.
   * Offline: generates a local UUID, queues a mutation for sync.
   * 
   * @param data - Income creation data (condominium_id, account_id, category_id, amount, etc.)
   * @returns Created FinancialTransaction with status='completed'
   * @throws Error if Supabase insert fails
   */
  async createIncome(data: CreateIncomeData): Promise<FinancialTransaction> {
    if (this.#networkStatus.isOnline()) {
      return this.#createIncomeOnline(data);
    }
    return this.#createIncomeOffline(data);
  }

  /**
   * Fetch income transactions for a condominium.
   * Online: fetches from Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   */
  async fetchIncomesByCondominium(
    condominiumId: string,
  ): Promise<FinancialTransaction[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType(ENTITY_TYPE);
        const incomes = entities
          .map((e) => e.data as unknown as FinancialTransaction)
          .filter((t) => t.condominium_id === condominiumId && t.type === 'income')
          .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));

        this.incomes$.next(incomes);
        return incomes;
      }

      const { data, error } = await this.client
        .from('financial_transactions')
        .select('*')
        .eq('condominium_id', condominiumId)
        .eq('type', 'income')
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      for (const income of data || []) {
        await this.#localRepo.upsert(ENTITY_TYPE, income);
      }

      this.incomes$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  // --- Private Methods ---

  async #createIncomeOnline(data: CreateIncomeData): Promise<FinancialTransaction> {
    const createdBy = this.#currentProfileId();
    const exchangeRate = data.exchange_rate ?? 1;
    const baseAmount = this.#calculateBaseAmount(data.amount, exchangeRate);
    const baseCurrency = this.#getBaseCurrency(data.condominium_id);

    const valuesToInsert = {
      condominium_id: data.condominium_id,
      account_id: data.account_id,
      category_id: data.category_id,
      type: 'income' as TransactionType,
      status: 'completed', // Default to completed for incomes
      amount: data.amount,
      original_currency: data.original_currency,
      exchange_rate: exchangeRate,
      base_amount: baseAmount,
      base_currency: baseCurrency,
      description: data.description,
      reference_number: data.reference_number ?? null,
      transaction_date: data.transaction_date,
      transfer_group_id: null,
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

    // Cache locally
    await this.#localRepo.upsert(ENTITY_TYPE, result);

    // Update local incomes list
    const currentIncomes = this.incomes$.getValue();
    this.incomes$.next([result, ...currentIncomes]);

    // Refresh wallet cache to reflect updated balance
    await this.#accounts.fetchByCondominium(data.condominium_id);

    // Track telemetry
    this.#telemetry.track(TelemetryEvents.FINANCIAL_TRANSACTION_CREATED, {
      transaction_type: 'income',
      amount: data.amount,
      currency: data.original_currency,
      condominium_id: data.condominium_id,
      is_transfer: false,
      has_exchange_rate: exchangeRate !== 1,
    });

    return result;
  }

  async #createIncomeOffline(
    data: CreateIncomeData,
  ): Promise<FinancialTransaction & { _local_status: 'pending' }> {
    const id = uuidv4();
    const createdBy = this.#currentProfileId();
    const exchangeRate = data.exchange_rate ?? 1;
    const baseAmount = this.#calculateBaseAmount(data.amount, exchangeRate);
    const baseCurrency = this.#getBaseCurrency(data.condominium_id);

    const income: FinancialTransaction = {
      id,
      condominium_id: data.condominium_id,
      account_id: data.account_id,
      category_id: data.category_id,
      transfer_group_id: null,
      type: 'income',
      status: 'pending', // Pending until synced online
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

    // Cache locally
    await this.#localRepo.upsert(ENTITY_TYPE, {
      ...income,
      _local_status: 'pending' as const,
    });

    // Update local incomes list
    const currentIncomes = this.incomes$.getValue();
    this.incomes$.next([income, ...currentIncomes]);

    // Queue creation for sync
    await this.#syncService.enqueueMutation(
      'create',
      ENTITY_TYPE,
      income.id,
      {
        ...data,
        type: 'income',
        status: 'pending',
        exchange_rate: exchangeRate,
        base_amount: baseAmount,
        base_currency: baseCurrency,
        created_by: createdBy,
        created_at: income.created_at,
        updated_at: income.updated_at,
      },
      `create-income-${income.id}-${Date.now()}`,
    );

    // Refresh wallet cache (will use local data if offline)
    await this.#accounts.fetchByCondominium(data.condominium_id);

    // Track telemetry
    this.#telemetry.track(TelemetryEvents.FINANCIAL_TRANSACTION_CREATED, {
      transaction_type: 'income',
      amount: data.amount,
      currency: data.original_currency,
      condominium_id: data.condominium_id,
      is_transfer: false,
      has_exchange_rate: exchangeRate !== 1,
    });

    return { ...income, _local_status: 'pending' as const };
  }

  #calculateBaseAmount(amount: number, exchangeRate: number): number {
    return Math.round(amount * exchangeRate * 100) / 100;
  }

  #getBaseCurrency(condominiumId: string): string {
    const condo = this.#context.activeCondominium();
    if (condo && condo.id === condominiumId && condo.currency) {
      return condo.currency;
    }
    return 'USD';
  }

  #currentProfileId(): string {
    const profile = this.#profile.profile$.getValue();
    if (!profile) {
      throw new Error('No profile loaded; cannot determine created_by');
    }
    return profile.id;
  }
}
