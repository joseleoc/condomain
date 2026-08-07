import { inject, Injectable } from '@angular/core';
import { FinancialTransactions } from '../financial-transactions/financial-transactions';
import { FinancialTransaction } from '@app-types/financial-transactions';
import { CondominiumAccounts } from '../condominium-accounts/condominium-accounts';
import { ContextService } from '../context/context.service';
import { BehaviorSubject } from 'rxjs';

export interface CreateExpenseData {
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
export class ExpensesService {
  // --- Dependencies ---
  #financialTransactions = inject(FinancialTransactions);
  #condominiumAccounts = inject(CondominiumAccounts);
  #contextService = inject(ContextService);

  // --- State ---
  expenses$ = new BehaviorSubject<FinancialTransaction[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<unknown>(null);

  // --- Methods ---

  /**
   * Create a new expense transaction.
   * Delegates to FinancialTransactions.create() with type='expense'.
   * After creation, refreshes wallet cache to reflect updated balance.
   *
   * @param data - Expense creation data
   * @returns Created FinancialTransaction with type='expense'
   */
  async createExpense(data: CreateExpenseData): Promise<FinancialTransaction> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      const baseCurrency = this.#contextService.activeCondominium()?.currency ?? 'USD';
      const expense = await this.#financialTransactions.create({
        condominium_id: data.condominium_id,
        account_id: data.account_id,
        category_id: data.category_id,
        type: 'expense',
        amount: data.amount,
        original_currency: data.original_currency,
        exchange_rate: data.exchange_rate,
        base_currency: baseCurrency,
        description: data.description,
        reference_number: data.reference_number,
        transaction_date: data.transaction_date,
      });

      // Refresh wallet cache to reflect updated balance
      await this.#condominiumAccounts.fetchByCondominium(data.condominium_id);

      // Update local expenses list
      const currentExpenses = this.expenses$.getValue();
      this.expenses$.next([expense, ...currentExpenses]);

      return expense;
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Fetch expense transactions for a condominium.
   * Delegates to FinancialTransactions.fetchByCondominium() with type='expense' filter.
   *
   * @param condominiumId - The condominium ID
   * @returns Array of expense FinancialTransactions
   */
  async fetchExpensesByCondominium(condominiumId: string): Promise<FinancialTransaction[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      const expenses = await this.#financialTransactions.fetchByCondominium(condominiumId, {
        type: 'expense',
      });

      this.expenses$.next(expenses);
      return expenses;
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Get account name by account ID from cached accounts.
   *
   * @param accountId - The account ID
   * @returns Account name or empty string if not found
   */
  getExpenseAccountName(accountId: string): string {
    const accounts = this.#condominiumAccounts.accounts$.getValue();
    const account = accounts.find((a) => a.id === accountId);
    return account?.name ?? '';
  }
}
