import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseListComponent } from './expense-list.component';
import { ExpensesService } from '@core/services/expenses/expenses.service';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { BehaviorSubject } from 'rxjs';
import { FinancialTransaction } from '@app-types/financial-transactions';

describe('ExpenseListComponent', () => {
  let component: ExpenseListComponent;
  let fixture: ComponentFixture<ExpenseListComponent>;
  let expensesServiceSpy: jasmine.SpyObj<ExpensesService>;
  let accountsServiceSpy: jasmine.SpyObj<CondominiumAccounts>;

  const mockExpenses: FinancialTransaction[] = [
    {
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
      description: 'Test expense 1',
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
    },
    {
      id: 'expense-2',
      condominium_id: 'condo-1',
      account_id: 'account-2',
      category_id: 'category-2',
      transfer_group_id: null,
      type: 'expense',
      status: 'pending',
      amount: 50,
      original_currency: 'EUR',
      exchange_rate: 1.1,
      base_amount: 55,
      base_currency: 'USD',
      description: 'Test expense 2',
      reference_number: 'REF-002',
      transaction_date: '2026-01-02',
      created_by: 'user-1',
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      deleted_at: null,
      approved_at: null,
      approved_by: null,
      reconciled_at: null,
      reconciled_by: null,
      reversal_transaction_id: null,
      reversed_by_transaction_id: null,
      reversal_reason: null,
    },
  ];

  const mockAccounts = [
    { id: 'account-1', name: 'Main Wallet', condominium_id: 'condo-1' },
    { id: 'account-2', name: 'Savings', condominium_id: 'condo-1' },
  ];

  beforeEach(async () => {
    const expSpy = jasmine.createSpyObj('ExpensesService', ['fetchExpensesByCondominium'], {
      expenses$: new BehaviorSubject(mockExpenses),
      loading$: new BehaviorSubject(false),
    });

    const accSpy = jasmine.createSpyObj('CondominiumAccounts', ['fetchByCondominium'], {
      accounts$: new BehaviorSubject(mockAccounts),
    });

    await TestBed.configureTestingModule({
      imports: [ExpenseListComponent],
      providers: [
        { provide: ExpensesService, useValue: expSpy },
        { provide: CondominiumAccounts, useValue: accSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpenseListComponent);
    component = fixture.componentInstance;

    expensesServiceSpy = TestBed.inject(ExpensesService) as jasmine.SpyObj<ExpensesService>;
    accountsServiceSpy = TestBed.inject(CondominiumAccounts) as jasmine.SpyObj<CondominiumAccounts>;

    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should fetch expenses and accounts', () => {
      expect(expensesServiceSpy.fetchExpensesByCondominium).toHaveBeenCalledWith('condo-1');
      expect(accountsServiceSpy.fetchByCondominium).toHaveBeenCalledWith('condo-1');
    });
  });

  describe('getAccountName', () => {
    it('should return account name for valid account ID', () => {
      const name = component.getAccountName('account-1');
      expect(name).toBe('Main Wallet');
    });

    it('should return "Unknown Account" for unknown account ID', () => {
      const name = component.getAccountName('unknown-account');
      expect(name).toBe('Unknown Account');
    });
  });

  describe('isPendingSync', () => {
    it('should return true for pending status', () => {
      const expense = mockExpenses[1]; // status: 'pending'
      expect(component.isPendingSync(expense)).toBeTrue();
    });

    it('should return false for completed status', () => {
      const expense = mockExpenses[0]; // status: 'completed'
      expect(component.isPendingSync(expense)).toBeFalse();
    });

    it('should return true for _local_status pending', () => {
      const expense = { ...mockExpenses[0], _local_status: 'pending' } as any;
      expect(component.isPendingSync(expense)).toBeTrue();
    });
  });

  describe('getSyncIcon', () => {
    it('should return sync-outline for pending expense', () => {
      const expense = mockExpenses[1]; // status: 'pending'
      expect(component.getSyncIcon(expense)).toBe('sync-outline');
    });

    it('should return checkmark-circle for completed expense', () => {
      const expense = mockExpenses[0]; // status: 'completed'
      expect(component.getSyncIcon(expense)).toBe('checkmark-circle');
    });
  });

  describe('getSyncColor', () => {
    it('should return warning for pending expense', () => {
      const expense = mockExpenses[1]; // status: 'pending'
      expect(component.getSyncColor(expense)).toBe('warning');
    });

    it('should return success for completed expense', () => {
      const expense = mockExpenses[0]; // status: 'completed'
      expect(component.getSyncColor(expense)).toBe('success');
    });
  });

  describe('getSyncText', () => {
    it('should return "Pending sync" for pending expense', () => {
      const expense = mockExpenses[1]; // status: 'pending'
      expect(component.getSyncText(expense)).toBe('Pending sync');
    });

    it('should return "Synced" for completed expense', () => {
      const expense = mockExpenses[0]; // status: 'completed'
      expect(component.getSyncText(expense)).toBe('Synced');
    });
  });

  describe('formatDate', () => {
    it('should format date in Spanish locale', () => {
      const formatted = component.formatDate('2026-01-15');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('15');
    });
  });

  describe('formatAmount', () => {
    it('should format amount with 2 decimals and currency', () => {
      const formatted = component.formatAmount(100.5, 'USD');
      expect(formatted).toBe('100.50 USD');
    });

    it('should handle zero amount', () => {
      const formatted = component.formatAmount(0, 'EUR');
      expect(formatted).toBe('0.00 EUR');
    });
  });

  describe('accountMap', () => {
    it('should create map of account IDs to names', () => {
      const map = component.accountMap();
      expect(map.get('account-1')).toBe('Main Wallet');
      expect(map.get('account-2')).toBe('Savings');
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading is true', () => {
      (expensesServiceSpy.loading$ as BehaviorSubject<boolean>).next(true);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('ion-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should not show list when loading', () => {
      (expensesServiceSpy.loading$ as BehaviorSubject<boolean>).next(true);
      fixture.detectChanges();

      const list = fixture.nativeElement.querySelector('ion-list');
      expect(list).toBeFalsy();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no expenses', () => {
      (expensesServiceSpy.expenses$ as BehaviorSubject<FinancialTransaction[]>).next([]);
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });

    it('should not show list when empty', () => {
      (expensesServiceSpy.expenses$ as BehaviorSubject<FinancialTransaction[]>).next([]);
      fixture.detectChanges();

      const list = fixture.nativeElement.querySelector('ion-list');
      expect(list).toBeFalsy();
    });
  });

  describe('populated state', () => {
    it('should show list when expenses exist', () => {
      const list = fixture.nativeElement.querySelector('ion-list');
      expect(list).toBeTruthy();
    });

    it('should render all expenses', () => {
      const items = fixture.nativeElement.querySelectorAll('ion-item');
      expect(items.length).toBe(2);
    });

    it('should display account names', () => {
      const labels = fixture.nativeElement.querySelectorAll('ion-label h2');
      expect(labels[0].textContent).toContain('Main Wallet');
      expect(labels[1].textContent).toContain('Savings');
    });

    it('should display amounts', () => {
      const amounts = fixture.nativeElement.querySelectorAll('.amount');
      expect(amounts[0].textContent).toContain('100.00 USD');
      expect(amounts[1].textContent).toContain('50.00 EUR');
    });
  });
});
