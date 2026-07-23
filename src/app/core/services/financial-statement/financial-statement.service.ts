import { inject, Injectable } from '@angular/core';
import { Supabase } from '@core/services/supabase/supabase';
import type {
  BalanceSheet,
  BalanceSheetEntry,
  IncomeStatement,
  IncomeStatementEntry,
} from '@app-types/account-balances';

@Injectable({ providedIn: 'root' })
export class FinancialStatementService {
  #client = inject(Supabase).client;

  /**
   * Generate income statement report (Estado de Resultados).
   * 
   * Shows revenues and expenses for a period, calculating net income.
   * Only includes income and expense account types.
   * 
   * @param condominiumId - The condominium ID
   * @param periodStart - Start date (YYYY-MM-DD)
   * @param periodEnd - End date (YYYY-MM-DD)
   * @returns IncomeStatement report
   * @throws Error if Supabase query fails
   */
  async generateIncomeStatement(
    condominiumId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<IncomeStatement> {
    // Fetch all income and expense accounts
    const { data: accounts, error: accountsError } = await this.#client
      .from('chart_of_accounts')
      .select('id, code, name, type')
      .eq('condominium_id', condominiumId)
      .in('type', ['income', 'expense'])
      .is('deleted_at', null)
      .order('code', { ascending: true });

    if (accountsError) throw accountsError;

    // Fetch all transaction entries for the period
    const { data: entries, error: entriesError } = await this.#client
      .from('financial_transaction_entries')
      .select(`
        id,
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

    // Build income statement entries
    const revenueEntries: IncomeStatementEntry[] = [];
    const expenseEntries: IncomeStatementEntry[] = [];

    for (const account of accounts || []) {
      const accountEntries = (entries || []).filter(
        (e) => e.account_id === account.id,
      );

      let amount = 0;
      for (const entry of accountEntries) {
        if (account.type === 'income') {
          amount += entry.entry_type === 'credit' ? entry.amount : -entry.amount;
        } else {
          amount += entry.entry_type === 'debit' ? entry.amount : -entry.amount;
        }
      }

      const statementEntry: IncomeStatementEntry = {
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        amount,
      };

      if (account.type === 'income') {
        revenueEntries.push(statementEntry);
      } else {
        expenseEntries.push(statementEntry);
      }
    }

    // Calculate totals
    const totalRevenues = revenueEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = expenseEntries.reduce((sum, e) => sum + e.amount, 0);
    const netIncome = totalRevenues - totalExpenses;

    return {
      condominium_id: condominiumId,
      period_start: periodStart,
      period_end: periodEnd,
      revenues: revenueEntries,
      expenses: expenseEntries,
      total_revenues: totalRevenues,
      total_expenses: totalExpenses,
      net_income: netIncome,
    };
  }

  /**
   * Generate balance sheet report (Balance General).
   * 
   * Shows assets, liabilities, and equity at a specific date.
   * Validates that assets = liabilities + equity.
   * 
   * @param condominiumId - The condominium ID
   * @param asOfDate - The date for the balance sheet (YYYY-MM-DD)
   * @returns BalanceSheet report
   * @throws Error if Supabase query fails
   */
  async generateBalanceSheet(
    condominiumId: string,
    asOfDate: string,
  ): Promise<BalanceSheet> {
    // Fetch all asset, liability, and equity accounts
    const { data: accounts, error: accountsError } = await this.#client
      .from('chart_of_accounts')
      .select('id, code, name, type')
      .eq('condominium_id', condominiumId)
      .in('type', ['asset', 'liability', 'equity'])
      .is('deleted_at', null)
      .order('code', { ascending: true });

    if (accountsError) throw accountsError;

    // Fetch all transaction entries up to the specified date
    const { data: entries, error: entriesError } = await this.#client
      .from('financial_transaction_entries')
      .select(`
        id,
        account_id,
        entry_type,
        amount,
        financial_transactions!inner (
          transaction_date,
          status
        )
      `)
      .eq('financial_transactions.condominium_id', condominiumId)
      .lte('financial_transactions.transaction_date', asOfDate)
      .eq('financial_transactions.status', 'completed')
      .is('financial_transactions.deleted_at', null);

    if (entriesError) throw entriesError;

    // Build balance sheet entries
    const assetEntries: BalanceSheetEntry[] = [];
    const liabilityEntries: BalanceSheetEntry[] = [];
    const equityEntries: BalanceSheetEntry[] = [];

    for (const account of accounts || []) {
      const accountEntries = (entries || []).filter(
        (e) => e.account_id === account.id,
      );

      let amount = 0;
      for (const entry of accountEntries) {
        if (account.type === 'asset') {
          amount += entry.entry_type === 'debit' ? entry.amount : -entry.amount;
        } else {
          amount += entry.entry_type === 'credit' ? entry.amount : -entry.amount;
        }
      }

      const statementEntry: BalanceSheetEntry = {
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        amount,
      };

      if (account.type === 'asset') {
        assetEntries.push(statementEntry);
      } else if (account.type === 'liability') {
        liabilityEntries.push(statementEntry);
      } else {
        equityEntries.push(statementEntry);
      }
    }

    // Calculate totals
    const totalAssets = assetEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalLiabilities = liabilityEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalEquity = equityEntries.reduce((sum, e) => sum + e.amount, 0);

    return {
      condominium_id: condominiumId,
      as_of_date: asOfDate,
      assets: assetEntries,
      liabilities: liabilityEntries,
      equity: equityEntries,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
      is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }
}
