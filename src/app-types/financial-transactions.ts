export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'completed' | 'voided';

export interface FinancialTransaction {
  id: string;
  condominium_id: string;
  account_id: string;
  category_id: string | null;
  transfer_group_id: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  original_currency: string;
  exchange_rate: number;
  base_amount: number;
  description: string;
  reference_number: string | null;
  transaction_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateFinancialTransactionData {
  condominium_id: string;
  account_id: string;
  category_id?: string | null;
  type: TransactionType;
  amount: number;
  original_currency: string;
  exchange_rate?: number;
  description: string;
  reference_number?: string | null;
  transaction_date: string;
  transfer_group_id?: string | null;
}

export interface CreateTransferData {
  condominium_id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  original_currency: string;
  exchange_rate?: number;
  description: string;
  transaction_date: string;
}

export interface UpdateFinancialTransactionData {
  account_id?: string;
  category_id?: string | null;
  amount?: number;
  original_currency?: string;
  exchange_rate?: number;
  description?: string;
  reference_number?: string | null;
  transaction_date?: string;
}

export interface TransactionFilter {
  account_id?: string;
  category_id?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  date_from?: string;
  date_to?: string;
}
