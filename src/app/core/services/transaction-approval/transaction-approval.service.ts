import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Supabase } from '@core/services/supabase/supabase';
import { NetworkStatusService } from '@core/services/network-status/network-status.service';
import { LocalRepository } from '@core/services/sync/local-repository';
import { SyncService } from '@core/services/sync/sync-service';
import { Profile } from '@core/services/profile/profile';
import { FinancialEventsService } from '@core/services/financial-events/financial-events.service';
import type { FinancialTransaction, TransactionStatus } from '@app-types/financial-transactions';

const ENTITY_TYPE = 'financial_transaction';

@Injectable({ providedIn: 'root' })
export class TransactionApprovalService {
  #client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);
  #syncService = inject(SyncService);
  #profile = inject(Profile);
  #financialEvents = inject(FinancialEventsService);

  pendingTransactions$ = new BehaviorSubject<FinancialTransaction[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<unknown>(null);

  /**
   * Fetch pending transactions for approval.
   * 
   * Returns all transactions with status = 'pending' for a condominium,
   * sorted by transaction_date (newest first).
   * 
   * @param condominiumId - The condominium ID to fetch pending transactions for
   * @returns Array of pending FinancialTransaction
   * @throws Error if Supabase query fails
   */
  async fetchPending(condominiumId: string): Promise<FinancialTransaction[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      const { data, error } = await this.#client
        .from('financial_transactions')
        .select('*')
        .eq('condominium_id', condominiumId)
        .eq('status', 'pending')
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      this.pendingTransactions$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Approve a transaction (pending → completed).
   * 
   * Updates transaction status to 'completed', records approval timestamp and admin.
   * Wallet balance is updated automatically via Postgres trigger.
   * Transaction becomes immutable after approval.
   * 
   * @param transactionId - The transaction ID to approve
   * @throws Error if Supabase update fails
   */
  async approve(transactionId: string): Promise<void> {
    const profileId = this.#getCurrentProfileId();
    const now = new Date().toISOString();

    // Fetch transaction BEFORE updating so we have data for the event
    const existing = await this.#localRepo.getById(ENTITY_TYPE, transactionId);
    const transaction = existing as unknown as FinancialTransaction;

    const { error } = await this.#client
      .from('financial_transactions')
      .update({
        status: 'completed',
        approved_at: now,
        approved_by: profileId,
        updated_at: now,
      })
      .eq('id', transactionId);

    if (error) throw error;

    // Update local cache
    if (existing) {
      await this.#localRepo.upsert(ENTITY_TYPE, {
        ...existing,
        status: 'completed',
        approved_at: now,
        approved_by: profileId,
        updated_at: now,
      });
    }

    // Refresh pending list
    const pending = this.pendingTransactions$.value.filter((t) => t.id !== transactionId);
    this.pendingTransactions$.next(pending);

    // Emit event so wallet balances and UI refresh
    if (transaction) {
      this.#financialEvents.emit({
        type: 'transaction:status-changed',
        condominiumId: transaction.condominium_id,
        accountId: transaction.account_id,
        transactionId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Void a transaction (pending → voided or completed → voided).
   * 
   * If transaction is completed: creates a reversal transaction automatically via RPC,
   * generates reversal accounting entries via trigger, marks original as voided.
   * If transaction is pending: simply changes status to voided (no reversal needed).
   * 
   * @param transactionId - The transaction ID to void
   * @param reason - Reason for voiding (audit trail, required for completed transactions)
   * @throws Error if transaction not found
   * @throws Error if transaction is already voided
   * @throws Error if Supabase RPC or update fails
   */
  async void(transactionId: string, reason: string): Promise<void> {
    const profileId = this.#getCurrentProfileId();

    const existing = await this.#localRepo.getById(ENTITY_TYPE, transactionId);
    if (!existing) throw new Error('Transaction not found');

    const transaction = existing as unknown as FinancialTransaction;

    if (transaction.status === 'completed') {
      // Create reversal transaction via RPC
      const { data: reversalId, error } = await this.#client.rpc(
        'create_reversal_transaction',
        {
          p_original_transaction_id: transactionId,
          p_reversal_reason: reason,
          p_approved_by: profileId,
        },
      );

      if (error) throw error;

      // Update local cache for original transaction
      await this.#localRepo.upsert(ENTITY_TYPE, {
        ...existing,
        status: 'voided',
        reversal_transaction_id: reversalId,
        reversal_reason: reason,
        updated_at: new Date().toISOString(),
      });
    } else if (transaction.status === 'pending') {
      // Simple void for pending transactions
      const now = new Date().toISOString();
      const { error } = await this.#client
        .from('financial_transactions')
        .update({
          status: 'voided',
          reversal_reason: reason,
          updated_at: now,
        })
        .eq('id', transactionId);

      if (error) throw error;

      await this.#localRepo.upsert(ENTITY_TYPE, {
        ...existing,
        status: 'voided',
        reversal_reason: reason,
        updated_at: now,
      });
    } else {
      throw new Error(`Cannot void transaction with status: ${transaction.status}`);
    }

    // Refresh pending list
    const pending = this.pendingTransactions$.value.filter((t) => t.id !== transactionId);
    this.pendingTransactions$.next(pending);

    // Emit event so wallet balances and UI refresh
    this.#financialEvents.emit({
      type: 'transaction:status-changed',
      condominiumId: transaction.condominium_id,
      accountId: transaction.account_id,
      transactionId,
      timestamp: new Date(),
    });
  }

  /**
   * Mark transaction as reconciled with bank statement.
   * 
   * Records reconciliation timestamp and admin who performed reconciliation.
   * Does not change transaction status (must be completed first).
   * 
   * @param transactionId - The transaction ID to mark as reconciled
   * @throws Error if Supabase update fails
   */
  async reconcile(transactionId: string): Promise<void> {
    const profileId = this.#getCurrentProfileId();
    const now = new Date().toISOString();

    const { error } = await this.#client
      .from('financial_transactions')
      .update({
        reconciled_at: now,
        reconciled_by: profileId,
        updated_at: now,
      })
      .eq('id', transactionId);

    if (error) throw error;

    // Update local cache
    const existing = await this.#localRepo.getById(ENTITY_TYPE, transactionId);
    if (existing) {
      await this.#localRepo.upsert(ENTITY_TYPE, {
        ...existing,
        reconciled_at: now,
        reconciled_by: profileId,
        updated_at: now,
      });
    }
  }

  #getCurrentProfileId(): string {
    const profile = this.#profile.profile$.getValue();
    if (!profile) {
      throw new Error('No profile loaded; cannot determine approved_by');
    }
    return profile.id;
  }
}
