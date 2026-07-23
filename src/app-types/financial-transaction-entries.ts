export type EntryType = 'debit' | 'credit';

export interface FinancialTransactionEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  entry_type: EntryType;
  amount: number;
  created_at: string;
}

export interface CreateFinancialTransactionEntryData {
  transaction_id: string;
  account_id: string;
  entry_type: EntryType;
  amount: number;
}
