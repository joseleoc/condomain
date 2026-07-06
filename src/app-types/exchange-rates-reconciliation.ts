/**
 * Exchange rate between two currencies for a specific date.
 * Used for multi-currency transaction processing.
 */
export interface ExchangeRate {
  id: string;
  condominium_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  source: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Data for creating a new exchange rate.
 */
export interface CreateExchangeRateData {
  condominium_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  source?: string | null;
}

/**
 * Bank reconciliation record.
 * Matches system transactions with bank statement entries.
 */
export interface BankReconciliation {
  id: string;
  condominium_id: string;
  account_id: string;
  statement_date: string;
  statement_balance: number;
  reconciled_balance: number;
  difference: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  reconciled_by: string | null;
  reconciled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Data for creating a new bank reconciliation.
 */
export interface CreateBankReconciliationData {
  condominium_id: string;
  account_id: string;
  statement_date: string;
  statement_balance: number;
  notes?: string | null;
}

/**
 * Individual line item in a bank reconciliation.
 * Links system transactions to bank statement entries.
 */
export interface BankReconciliationItem {
  id: string;
  reconciliation_id: string;
  transaction_id: string | null;
  statement_reference: string | null;
  statement_date: string | null;
  statement_amount: number | null;
  match_status: 'unmatched' | 'matched' | 'cleared' | 'exception';
  notes: string | null;
  created_at: string;
}

/**
 * Data for creating a new reconciliation item.
 */
export interface CreateReconciliationItemData {
  reconciliation_id: string;
  transaction_id?: string | null;
  statement_reference?: string | null;
  statement_date?: string | null;
  statement_amount?: number | null;
  notes?: string | null;
}

/**
 * Owner financial summary for self-service portal.
 * Shows owner's payments, balances, and statements.
 */
export interface OwnerFinancialSummary {
  owner_id: string;
  condominium_id: string;
  property_name: string;
  total_paid: number;
  total_pending: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  statements: OwnerStatement[];
}

/**
 * Financial statement for an owner.
 * Shows charges and payments for a specific period.
 */
export interface OwnerStatement {
  id: string;
  period_start: string;
  period_end: string;
  charges: OwnerStatementCharge[];
  payments: OwnerStatementPayment[];
  total_charges: number;
  total_payments: number;
  balance: number;
}

/**
 * Charge line item in an owner statement.
 */
export interface OwnerStatementCharge {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

/**
 * Payment line item in an owner statement.
 */
export interface OwnerStatementPayment {
  id: string;
  date: string;
  description: string;
  reference_number: string | null;
  amount: number;
  status: 'pending' | 'completed' | 'voided';
}
