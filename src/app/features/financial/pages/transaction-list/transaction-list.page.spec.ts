import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { TransactionListPage } from './transaction-list.page';
import { FinancialTransactions } from '@core/services/financial-transactions/financial-transactions';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { ContextService } from '@core/services/context/context.service';
import { Toast } from '@core/services/toast/toast';
import { BehaviorSubject } from 'rxjs';
import type { FinancialTransaction } from '@app-types/financial-transactions';

describe('TransactionListPage', () => {
  let component: TransactionListPage;
  let fixture: ComponentFixture<TransactionListPage>;

  const mockTransaction: FinancialTransaction = {
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
    description: 'Test',
    reference_number: null,
    transaction_date: '2026-07-01',
    created_by: 'profile-1',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    deleted_at: null,
  };

  beforeEach(async () => {
    const transactionsService = {
      transactions$: new BehaviorSubject<FinancialTransaction[]>([mockTransaction]),
      loading$: new BehaviorSubject<boolean>(false),
      error$: new BehaviorSubject<unknown>(null),
      fetchByCondominium: jasmine.createSpy('fetchByCondominium').and.returnValue(Promise.resolve([mockTransaction])),
      updateStatus: jasmine.createSpy('updateStatus').and.returnValue(Promise.resolve()),
    };

    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, TransactionListPage],
      providers: [
        { provide: FinancialTransactions, useValue: transactionsService },
        {
          provide: CondominiumAccounts,
          useValue: { accounts$: new BehaviorSubject([]), fetchByCondominium: () => Promise.resolve([]) },
        },
        {
          provide: TransactionCategories,
          useValue: { categories$: new BehaviorSubject([]), fetchByCondominium: () => Promise.resolve([]) },
        },
        {
          provide: ContextService,
          useValue: {
            activeCondominium: signal({ id: 'condo-1', currency: 'USD' }),
          },
        },
        {
          provide: Toast,
          useValue: { present: () => Promise.resolve() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build filters from signal values', () => {
    component.accountFilter.set('account-1');
    component.typeFilter.set('expense');
    component.statusFilter.set('pending');
    component.dateFromFilter.set('2026-07-01');
    component.dateToFilter.set('2026-07-31');

    const filters = component.filters();
    expect(filters.account_id).toBe('account-1');
    expect(filters.type).toBe('expense');
    expect(filters.status).toBe('pending');
    expect(filters.date_from).toBe('2026-07-01');
    expect(filters.date_to).toBe('2026-07-31');
  });

  it('should open transaction form', () => {
    component.openTransactionForm();
    expect(component.isTransactionFormOpen()).toBe(true);
  });

  it('should open transfer form', () => {
    component.openTransferForm();
    expect(component.isTransferFormOpen()).toBe(true);
  });
});
