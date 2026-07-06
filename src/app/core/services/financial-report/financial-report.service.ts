import { inject, Injectable } from '@angular/core';
import { Supabase } from '@core/services/supabase/supabase';
import type {
  TrialBalance,
  TrialBalanceEntry,
  GeneralLedger,
  GeneralLedgerEntry,
  Journal,
  JournalEntry,
} from '@app-types/account-balances';

@Injectable({ providedIn: 'root' })
export class FinancialReportService {
  #client = inject(Supabase).client;

  /**
   * Generate trial balance report (Balance de Comprobación).
   * 
   * Lists all accounts with their debit/credit totals and balances for a period.
   * Validates that total debits equal total credits.
   * 
   * @param condominiumId - The condominium ID
   * @param periodStart - Start date (YYYY-MM-DD)
   * @param periodEnd - End date (YYYY-MM-DD)
   * @returns TrialBalance report
   * @throws Error if Supabase query fails
   */
  async generateTrialBalance(
    condominiumId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<TrialBalance> {
    // Fetch all chart of accounts for the condominium
    const { data: accounts, error: accountsError } = await this.#client
      .from('chart_of_accounts')
      .select('id, code, name, type')
      .eq('condominium_id', condominiumId)
      .is('deleted_at', null)
      .order('code', { ascending: true });

    if (accountsError) throw accountsError;

    // Fetch all transaction entries for the period
    const { data: entries, error: entriesError } = await this.#client
      .from('financial_transaction_entries')
      .select(`
        id,
        transaction_id,
        account_id,
        entry_type,
        amount,
        financial_transactions!inner (
          transaction_date,
          status
        )
      `)
      .eq('financial_transactions.condominium_id', condominiumId)
      .gte('financial_transactions.transaction_date', periodStart)
      .lte('financial_transactions.transaction_date', periodEnd)
      .eq('financial_transactions.status', 'completed')
      .is('financial_transactions.deleted_at', null);

    if (entriesError) throw entriesError;

    // Build trial balance entries
    const trialEntries: TrialBalanceEntry[] = accounts.map((account) => {
      const accountEntries = (entries || []).filter(
        (e) => e.account_id === account.id,
      );

      const totalDebits = accountEntries
        .filter((e) => e.entry_type === 'debit')
        .reduce((sum, e) => sum + e.amount, 0);

      const totalCredits = accountEntries
        .filter((e) => e.entry_type === 'credit')
        .reduce((sum, e) => sum + e.amount, 0);

      // Calculate balance based on account type
      let balance: number;
      if (account.type === 'asset' || account.type === 'expense') {
        balance = totalDebits - totalCredits;
      } else {
        balance = totalCredits - totalDebits;
      }

      return {
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        account_type: account.type,
        total_debits: totalDebits,
        total_credits: totalCredits,
        balance,
      };
    });

    // Calculate totals
    const totalDebits = trialEntries.reduce((sum, e) => sum + e.total_debits, 0);
    const totalCredits = trialEntries.reduce((sum, e) => sum + e.total_credits, 0);

    return {
      condominium_id: condominiumId,
      period_start: periodStart,
      period_end: periodEnd,
      entries: trialEntries,
      total_debits: totalDebits,
      total_credits: totalCredits,
      is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }

  /**
   * Generate general ledger report (Libro Mayor).
   * 
   * Shows all transactions for a specific account in a period.
   * Includes running balance calculation.
   * 
   * @param accountId - The chart of accounts ID
   * @param periodStart - Start date (YYYY-MM-DD)
   * @param periodEnd - End date (YYYY-MM-DD)
   * @returns GeneralLedger report
   * @throws Error if Supabase query fails
   */
  async generateGeneralLedger(
    accountId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<GeneralLedger> {
    // Fetch account details
    const { data: account, error: accountError } = await this.#client
      .from('chart_of_accounts')
      .select('id, code, name, type')
      .eq('id', accountId)
      .single();

    if (accountError) throw accountError;

    // Fetch all entries for this account in the period
    const { data: entries, error: entriesError } = await this.#client
      .from('financial_transaction_entries')
      .select(`
        id,
        transaction_id,
        entry_type,
        amount,
        financial_transactions!inner (
          id,
          transaction_date,
          description,
          reference_number,
          status
        )
      `)
      .eq('account_id', accountId)
      .gte('financial_transactions.transaction_date', periodStart)
      .lte('financial_transactions.transaction_date', periodEnd)
      .eq('financial_transactions.status', 'completed')
      .is('financial_transactions.deleted_at', null)
      .order('financial_transactions.transaction_date', { ascending: true });

    if (entriesError) throw entriesError;

    // Calculate opening balance (sum of all entries before period)
    const { data: priorEntries, error: priorError } = await this.#client
      .from('financial_transaction_entries')
      .select('entry_type, amount')
      .eq('account_id', accountId)
      .lt('financial_transactions.transaction_date', periodStart)
      .eq('financial_transactions.status', 'completed')
      .is('financial_transactions.deleted_at', null);

    if (priorError) throw priorError;

    let openingBalance = 0;
    for (const entry of priorEntries || []) {
      if (account.type === 'asset' || account.type === 'expense') {
        openingBalance += entry.entry_type === 'debit' ? entry.amount : -entry.amount;
      } else {
        openingBalance += entry.entry_type === 'credit' ? entry.amount : -entry.amount;
      }
    }

    // Build ledger entries with running balance
    const ledgerEntries: GeneralLedgerEntry[] = [];
    let runningBalance = openingBalance;

    for (const entry of entries || []) {
      const ft = entry.financial_transactions as any;

      if (account.type === 'asset' || account.type === 'expense') {
        runningBalance += entry.entry_type === 'debit' ? entry.amount : -entry.amount;
      } else {
        runningBalance += entry.entry_type === 'credit' ? entry.amount : -entry.amount;
      }

      ledgerEntries.push({
        transaction_id: ft.id,
        transaction_date: ft.transaction_date,
        description: ft.description,
        reference_number: ft.reference_number,
        entry_type: entry.entry_type,
        amount: entry.amount,
        balance: runningBalance,
      });
    }

    return {
      account_id: accountId,
      account_code: account.code,
      account_name: account.name,
      account_type: account.type,
      period_start: periodStart,
      period_end: periodEnd,
      entries: ledgerEntries,
      opening_balance: openingBalance,
      closing_balance: runningBalance,
    };
  }

  /**
   * Generate journal report (Libro Diario).
   * 
   * Shows all transactions in chronological order for a period.
   * Each transaction shows its debit and credit entries.
   * 
   * @param condominiumId - The condominium ID
   * @param periodStart - Start date (YYYY-MM-DD)
   * @param periodEnd - End date (YYYY-MM-DD)
   * @returns Journal report
   * @throws Error if Supabase query fails
   */
  async generateJournal(
    condominiumId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<Journal> {
    // Fetch all completed transactions for the period
    const { data: transactions, error: txError } = await this.#client
      .from('financial_transactions')
      .select('id, transaction_date, description, reference_number')
      .eq('condominium_id', condominiumId)
      .gte('transaction_date', periodStart)
      .lte('transaction_date', periodEnd)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('transaction_date', { ascending: true });

    if (txError) throw txError;

    // Fetch all entries for these transactions
    const transactionIds = (transactions || []).map((t) => t.id);
    const { data: entries, error: entriesError } = await this.#client
      .from('financial_transaction_entries')
      .select(`
        id,
        transaction_id,
        entry_type,
        amount,
        chart_of_accounts!inner (
          code,
          name
        )
      `)
      .in('transaction_id', transactionIds)
      .order('transaction_id', { ascending: true });

    if (entriesError) throw entriesError;

    // Build journal entries
    const journalEntries: JournalEntry[] = (transactions || []).map((tx) => {
      const txEntries = (entries || []).filter((e) => e.transaction_id === tx.id);

      return {
        transaction_id: tx.id,
        transaction_date: tx.transaction_date,
        description: tx.description,
        reference_number: tx.reference_number,
        entries: txEntries.map((e) => ({
          account_code: (e.chart_of_accounts as any).code,
          account_name: (e.chart_of_accounts as any).name,
          entry_type: e.entry_type,
          amount: e.amount,
        })),
      };
    });

    return {
      condominium_id: condominiumId,
      period_start: periodStart,
      period_end: periodEnd,
      entries: journalEntries,
    };
  }
}
