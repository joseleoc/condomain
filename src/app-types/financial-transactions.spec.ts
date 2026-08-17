import type {
  CreateFinancialTransactionData,
  CreateTransferData,
  FinancialTransaction,
  TransactionFilter,
  TransactionStatus,
  TransactionType,
  UpdateFinancialTransactionData,
} from './financial-transactions';

describe('FinancialTransactions types', () => {
  it('should accept valid transaction types', () => {
    const types: TransactionType[] = ['income', 'expense', 'transfer'];
    expect(types).toEqual(['income', 'expense', 'transfer']);
  });

  it('should accept valid transaction statuses', () => {
    const statuses: TransactionStatus[] = ['pending', 'completed', 'voided'];
    expect(statuses).toEqual(['pending', 'completed', 'voided']);
  });

  it('should allow building a FinancialTransaction object', () => {
    const transaction: FinancialTransaction = {
      id: 'tx-1',
      condominium_id: 'condo-1',
      account_id: 'account-1',
      category_id: 'category-1',
      transfer_group_id: null,
      type: 'expense',
      status: 'pending',
      amount: 100,
      original_currency: 'USD',
      exchange_rate: 1,
      base_amount: 100,
      base_currency: 'USD',
      description: 'Test',
      reference_number: 'REF-001',
      transaction_date: '2026-07-01',
      created_by: 'profile-1',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      deleted_at: null,
      approved_at: null,
      approved_by: null,
      reconciled_at: null,
      reconciled_by: null,
      reversal_transaction_id: null,
      reversed_by_transaction_id: null,
      reversal_reason: null,
    };
    expect(transaction).toBeTruthy();
  });

  it('should allow creating with CreateFinancialTransactionData', () => {
    const data: CreateFinancialTransactionData = {
      condominium_id: 'condo-1',
      account_id: 'account-1',
      category_id: 'category-1',
      type: 'income',
      amount: 100,
      original_currency: 'USD',
      base_currency: 'USD',
      description: 'Test',
      transaction_date: '2026-07-01',
    };
    expect(data).toBeTruthy();
  });

  it('should allow transfer data', () => {
    const data: CreateTransferData = {
      condominium_id: 'condo-1',
      source_account_id: 'account-1',
      destination_account_id: 'account-2',
      amount: 100,
      original_currency: 'USD',
      base_currency: 'USD',
      description: 'Transfer',
      transaction_date: '2026-07-01',
    };
    expect(data).toBeTruthy();
  });

  it('should allow update data', () => {
    const data: UpdateFinancialTransactionData = {
      description: 'Updated',
      amount: 200,
    };
    expect(data).toBeTruthy();
  });

  it('should allow filter data', () => {
    const filter: TransactionFilter = {
      account_id: 'account-1',
      status: 'pending',
      date_from: '2026-07-01',
    };
    expect(filter).toBeTruthy();
  });
});
