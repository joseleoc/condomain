import { inject, Injectable } from '@angular/core';
import { Supabase } from '@core/services/supabase/supabase';
import { TelemetryService } from '@core/services/telemetry/telemetry.service';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';
import type { FinancialTransaction, TransactionType } from '@app-types/financial-transactions';
import type { ChartOfAccounts } from '@app-types/chart-of-accounts';
import type { EntryType, CreateFinancialTransactionEntryData } from '@app-types/financial-transaction-entries';

@Injectable({ providedIn: 'root' })
export class AccountingEngineService {
  #client = inject(Supabase).client;
  #telemetry = inject(TelemetryService);

  /**
   * Generate double-entry accounting entries for a financial transaction.
   *
   * Rules:
   * - Income: Debit asset account (wallet), Credit income account (category)
   * - Expense: Debit expense account (category), Credit asset account (wallet)
   * - Transfer: Debit destination asset, Credit source asset
   *
   * @param transaction The financial transaction to generate entries for
   * @param walletAccount The wallet's chart_of_accounts entry
   * @param categoryAccount The category's chart_of_accounts entry (null for transfers)
   * @param destinationAccount Optional destination wallet account (for transfers)
   */
  async generateEntries(
    transaction: FinancialTransaction,
    walletAccount: ChartOfAccounts,
    categoryAccount: ChartOfAccounts | null,
    destinationAccount?: ChartOfAccounts,
  ): Promise<void> {
    const entries = this.#buildEntries(transaction, walletAccount, categoryAccount, destinationAccount);

    // Validate double-entry balance
    this.#validateDoubleEntry(entries, transaction.amount);

    // Insert entries
    const { error } = await this.#client
      .from('financial_transaction_entries')
      .insert(entries.map((e) => ({
        transaction_id: e.transaction_id,
        account_id: e.account_id,
        entry_type: e.entry_type,
        amount: e.amount,
      })));

    if (error) throw error;

    // Track telemetry
    this.#telemetry.track(TelemetryEvents.ACCOUNTING_ENTRY_CREATED, {
      transaction_type: transaction.type,
      entry_count: entries.length,
      amount: transaction.amount,
    });

    this.#telemetry.track(TelemetryEvents.DOUBLE_ENTRY_VALIDATED, {
      transaction_type: transaction.type,
      is_balanced: true,
    });
  }

  #buildEntries(
    transaction: FinancialTransaction,
    walletAccount: ChartOfAccounts,
    categoryAccount: ChartOfAccounts | null,
    destinationAccount?: ChartOfAccounts,
  ): CreateFinancialTransactionEntryData[] {
    const entries: CreateFinancialTransactionEntryData[] = [];

    switch (transaction.type) {
      case 'income':
        if (!categoryAccount) throw new Error('Category account required for income');
        // Debit: Asset account (wallet increases)
        entries.push({
          transaction_id: transaction.id,
          account_id: walletAccount.id,
          entry_type: 'debit',
          amount: transaction.amount,
        });
        // Credit: Income account (category)
        entries.push({
          transaction_id: transaction.id,
          account_id: categoryAccount.id,
          entry_type: 'credit',
          amount: transaction.amount,
        });
        break;

      case 'expense':
        if (!categoryAccount) throw new Error('Category account required for expense');
        // Debit: Expense account (category)
        entries.push({
          transaction_id: transaction.id,
          account_id: categoryAccount.id,
          entry_type: 'debit',
          amount: transaction.amount,
        });
        // Credit: Asset account (wallet decreases)
        entries.push({
          transaction_id: transaction.id,
          account_id: walletAccount.id,
          entry_type: 'credit',
          amount: transaction.amount,
        });
        break;

      case 'transfer':
        if (!destinationAccount) throw new Error('Destination account required for transfer');
        // Debit: Destination asset account
        entries.push({
          transaction_id: transaction.id,
          account_id: destinationAccount.id,
          entry_type: 'debit',
          amount: transaction.amount,
        });
        // Credit: Source asset account
        entries.push({
          transaction_id: transaction.id,
          account_id: walletAccount.id,
          entry_type: 'credit',
          amount: transaction.amount,
        });
        break;

      default:
        throw new Error(`Unknown transaction type: ${(transaction as { type: string }).type}`);
    }

    return entries;
  }

  #validateDoubleEntry(
    entries: CreateFinancialTransactionEntryData[],
    expectedAmount: number,
  ): void {
    const debits = entries
      .filter((e) => e.entry_type === 'debit')
      .reduce((sum, e) => sum + e.amount, 0);

    const credits = entries
      .filter((e) => e.entry_type === 'credit')
      .reduce((sum, e) => sum + e.amount, 0);

    if (Math.abs(debits - credits) > 0.01) {
      throw new Error(`Double-entry validation failed: debits=${debits}, credits=${credits}`);
    }

    if (Math.abs(debits - expectedAmount) > 0.01) {
      throw new Error(`Entry amount mismatch: expected=${expectedAmount}, actual=${debits}`);
    }
  }
}
