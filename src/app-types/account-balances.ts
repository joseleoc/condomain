/**
 * Monthly balance snapshot for a chart of accounts entry.
 * Tracks opening balance, debits, credits, and closing balance for each month.
 */
export interface AccountMonthlyBalance {
  id: string;
  account_id: string;
  year: number;
  month: number;
  opening_balance: number;
  total_debits: number;
  total_credits: number;
  closing_balance: number;
  created_at: string;
  updated_at: string;
}

/**
 * Annual balance snapshot for a chart of accounts entry.
 * Aggregates monthly balances for fiscal year reporting.
 */
export interface AccountAnnualBalance {
  id: string;
  account_id: string;
  year: number;
  opening_balance: number;
  total_debits: number;
  total_credits: number;
  closing_balance: number;
  is_closed: boolean;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Trial balance entry for a specific account.
 * Used for Balance de Comprobación report.
 */
export interface TrialBalanceEntry {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  total_debits: number;
  total_credits: number;
  balance: number;
}

/**
 * Trial balance report (Balance de Comprobación).
 * Lists all accounts with their debit/credit totals and balances.
 */
export interface TrialBalance {
  condominium_id: string;
  period_start: string;
  period_end: string;
  entries: TrialBalanceEntry[];
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
}

/**
 * Income statement entry (Estado de Resultados).
 * Shows revenues and expenses for a period.
 */
export interface IncomeStatementEntry {
  account_id: string;
  account_code: string;
  account_name: string;
  amount: number;
}

/**
 * Income statement report (Estado de Resultados).
 * Shows revenues, expenses, and net income for a period.
 */
export interface IncomeStatement {
  condominium_id: string;
  period_start: string;
  period_end: string;
  revenues: IncomeStatementEntry[];
  expenses: IncomeStatementEntry[];
  total_revenues: number;
  total_expenses: number;
  net_income: number;
}

/**
 * Balance sheet entry (Balance General).
 * Shows assets, liabilities, and equity at a point in time.
 */
export interface BalanceSheetEntry {
  account_id: string;
  account_code: string;
  account_name: string;
  amount: number;
}

/**
 * Balance sheet report (Balance General).
 * Shows assets, liabilities, and equity at a specific date.
 */
export interface BalanceSheet {
  condominium_id: string;
  as_of_date: string;
  assets: BalanceSheetEntry[];
  liabilities: BalanceSheetEntry[];
  equity: BalanceSheetEntry[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  is_balanced: boolean;
}

/**
 * General ledger entry (Libro Mayor).
 * Shows all transactions for a specific account.
 */
export interface GeneralLedgerEntry {
  transaction_id: string;
  transaction_date: string;
  description: string;
  reference_number: string | null;
  entry_type: 'debit' | 'credit';
  amount: number;
  balance: number;
}

/**
 * General ledger report (Libro Mayor).
 * Shows all transactions for a specific account in a period.
 */
export interface GeneralLedger {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  period_start: string;
  period_end: string;
  entries: GeneralLedgerEntry[];
  opening_balance: number;
  closing_balance: number;
}

/**
 * Journal entry (Libro Diario).
 * Shows all transactions in chronological order.
 */
export interface JournalEntry {
  transaction_id: string;
  transaction_date: string;
  description: string;
  reference_number: string | null;
  entries: {
    account_code: string;
    account_name: string;
    entry_type: 'debit' | 'credit';
    amount: number;
  }[];
}

/**
 * Journal report (Libro Diario).
 * Shows all transactions in chronological order for a period.
 */
export interface Journal {
  condominium_id: string;
  period_start: string;
  period_end: string;
  entries: JournalEntry[];
}
