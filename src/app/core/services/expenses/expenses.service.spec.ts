import { TestBed } from '@angular/core/testing';
import { ExpensesService, CreateExpenseData } from './expenses.service';
import { FinancialTransactions } from '../financial-transactions/financial-transactions';
import { CondominiumAccounts } from '../condominium-accounts/condominium-accounts';
import { FinancialTransaction } from '@app-types/financial-transactions';
import { BehaviorSubject } from 'rxjs';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let financialTransactionsSpy: jasmine.SpyObj<FinancialTransactions>;
  let condominiumAccountsSpy: jasmine.SpyObj<CondominiumAccounts>;

  const mockExpense: FinancialTransaction = {
    id: 'expense-1',
    condominium_id: 'condo-1',
    account_id: 'account-1',
    category_id: 'category-1',
    transfer_group_id: null,
    type: 'expense',
    status: 'completed',
    amount: 100,
    original_currency: 'USD',
    exchange_rate: 1,
    base_amount: 100,
    base_currency: 'USD',
    description: 'Test expense',
    reference_number: null,
    transaction_date: '2026-01-01',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    approved_at: null,
    approved_by: null,
    reconciled_at: null,
    reconciled_by: null,
    reversal_transaction_id: null,
    reversed_by_transaction_id: null,
    reversal_reason: null,
  };

  beforeEach(() => {
    const ftSpy = jasmine.createSpyObj('FinancialTransactions', [
      'create',
      'fetchByCondominium',
    ]);

    const caSpy = jasmine.createSpyObj('CondominiumAccounts', ['fetchByCondominium'], {
      accounts$: new BehaviorSubject([
        { id: 'account-1', name: 'Main Wallet', condominium_id: 'condo-1' },
      ]),
    });

    TestBed.configureTestingModule({
      providers: [
        ExpensesService,
        { provide: FinancialTransactions, useValue: ftSpy },
        { provide: CondominiumAccounts, useValue: caSpy },
      ],
    });

    service = TestBed.inject(ExpensesService);
    financialTransactionsSpy = TestBed.inject(
      FinancialTransactions,
    ) as jasmine.SpyObj<FinancialTransactions>;
    condominiumAccountsSpy = TestBed.inject(
      CondominiumAccounts,
    ) as jasmine.SpyObj<CondominiumAccounts>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createExpense', () => {
    const createExpenseData: CreateExpenseData = {
      condominium_id: 'condo-1',
      account_id: 'account-1',
      category_id: 'category-1',
      amount: 100,
      original_currency: 'USD',
      description: 'Test expense',
      transaction_date: '2026-01-01',
    };

    it('should call FinancialTransactions.create with type=expense', async () => {
      financialTransactionsSpy.create.and.returnValue(Promise.resolve(mockExpense));

      await service.createExpense(createExpenseData);

      expect(financialTransactionsSpy.create).toHaveBeenCalledWith({
        ...createExpenseData,
        type: 'expense',
      });
    });

    it('should refresh wallet cache after creation', async () => {
      financialTransactionsSpy.create.and.returnValue(Promise.resolve(mockExpense));

      await service.createExpense(createExpenseData);

      expect(condominiumAccountsSpy.fetchByCondominium).toHaveBeenCalledWith('condo-1');
    });

    it('should update expenses$ with new expense', async () => {
      financialTransactionsSpy.create.and.returnValue(Promise.resolve(mockExpense));

      await service.createExpense(createExpenseData);

      let expenses: FinancialTransaction[] = [];
      service.expenses$.subscribe((e) => (expenses = e)).unsubscribe();

      expect(expenses).toEqual([mockExpense]);
    });

    it('should prepend new expense to existing expenses', async () => {
      const existingExpense = { ...mockExpense, id: 'existing-1' };
      service.expenses$.next([existingExpense]);
      financialTransactionsSpy.create.and.returnValue(Promise.resolve(mockExpense));

      await service.createExpense(createExpenseData);

      let expenses: FinancialTransaction[] = [];
      service.expenses$.subscribe((e) => (expenses = e)).unsubscribe();

      expect(expenses).toEqual([mockExpense, existingExpense]);
    });

    it('should set loading$ to true during creation', async () => {
      financialTransactionsSpy.create.and.returnValue(
        new Promise((resolve) => setTimeout(() => resolve(mockExpense), 100)),
      );

      const loadingValues: boolean[] = [];
      const subscription = service.loading$.subscribe((loading) =>
        loadingValues.push(loading),
      );

      await service.createExpense(createExpenseData);

      subscription.unsubscribe();

      expect(loadingValues[0]).toBeTrue();
      expect(loadingValues[loadingValues.length - 1]).toBeFalse();
    });

    it('should set error$ on failure', async () => {
      const error = new Error('Creation failed');
      financialTransactionsSpy.create.and.returnValue(Promise.reject(error));

      try {
        await service.createExpense(createExpenseData);
      } catch (e) {
        // Expected
      }

      let capturedError: unknown = null;
      service.error$.subscribe((err) => (capturedError = err)).unsubscribe();

      expect(capturedError).toBe(error);
    });

    it('should throw error on failure', async () => {
      const error = new Error('Creation failed');
      financialTransactionsSpy.create.and.returnValue(Promise.reject(error));

      await expectAsync(service.createExpense(createExpenseData)).toBeRejectedWith(
        'Creation failed',
      );
    });
  });

  describe('fetchExpensesByCondominium', () => {
    it('should call FinancialTransactions.fetchByCondominium with type=expense filter', async () => {
      financialTransactionsSpy.fetchByCondominium.and.returnValue(
        Promise.resolve([mockExpense]),
      );

      await service.fetchExpensesByCondominium('condo-1');

      expect(financialTransactionsSpy.fetchByCondominium).toHaveBeenCalledWith('condo-1', {
        type: 'expense',
      });
    });

    it('should update expenses$ with fetched expenses', async () => {
      financialTransactionsSpy.fetchByCondominium.and.returnValue(
        Promise.resolve([mockExpense]),
      );

      await service.fetchExpensesByCondominium('condo-1');

      let expenses: FinancialTransaction[] = [];
      service.expenses$.subscribe((e) => (expenses = e)).unsubscribe();

      expect(expenses).toEqual([mockExpense]);
    });

    it('should set loading$ to true during fetch', async () => {
      financialTransactionsSpy.fetchByCondominium.and.returnValue(
        new Promise((resolve) => setTimeout(() => resolve([mockExpense]), 100)),
      );

      const loadingValues: boolean[] = [];
      const subscription = service.loading$.subscribe((loading) =>
        loadingValues.push(loading),
      );

      await service.fetchExpensesByCondominium('condo-1');

      subscription.unsubscribe();

      expect(loadingValues[0]).toBeTrue();
      expect(loadingValues[loadingValues.length - 1]).toBeFalse();
    });

    it('should set error$ on failure', async () => {
      const error = new Error('Fetch failed');
      financialTransactionsSpy.fetchByCondominium.and.returnValue(Promise.reject(error));

      try {
        await service.fetchExpensesByCondominium('condo-1');
      } catch (e) {
        // Expected
      }

      let capturedError: unknown = null;
      service.error$.subscribe((err) => (capturedError = err)).unsubscribe();

      expect(capturedError).toBe(error);
    });
  });

  describe('getExpenseAccountName', () => {
    it('should return account name for valid account ID', () => {
      const name = service.getExpenseAccountName('account-1');

      expect(name).toBe('Main Wallet');
    });

    it('should return empty string for unknown account ID', () => {
      const name = service.getExpenseAccountName('unknown-account');

      expect(name).toBe('');
    });
  });
});
