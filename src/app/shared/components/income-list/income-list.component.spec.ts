import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { IncomeListComponent } from './income-list.component';
import { IncomesService } from '@core/services/incomes/incomes.service';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { FinancialTransaction } from '@app-types/financial-transactions';
import { CondominiumAccount } from '@app-types/condominium-accounts';

describe('IncomeListComponent', () => {
  let component: IncomeListComponent;
  let fixture: ComponentFixture<IncomeListComponent>;
  let mockIncomesService: jasmine.SpyObj<IncomesService>;
  let mockAccountsService: jasmine.SpyObj<CondominiumAccounts>;

  const mockAccounts: CondominiumAccount[] = [
    {
      id: 'account-1',
      condominium_id: 'condo-1',
      name: 'Main Wallet',
      account_type: 'bank',
      currency: 'USD',
      institution_name: null,
      initial_balance: 0,
      current_balance: 100,
      icon: null,
      color: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
    },
    {
      id: 'account-2',
      condominium_id: 'condo-1',
      name: 'Reserve Fund',
      account_type: 'bank',
      currency: 'USD',
      institution_name: null,
      initial_balance: 0,
      current_balance: 500,
      icon: null,
      color: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
    },
  ];

  const mockIncomes: FinancialTransaction[] = [
    {
      id: '1',
      condominium_id: 'condo-1',
      account_id: 'account-1',
      category_id: 'category-1',
      type: 'income',
      status: 'completed',
      amount: 100,
      original_currency: 'USD',
      exchange_rate: 1,
      base_amount: 100,
      base_currency: 'USD',
      description: 'Monthly fee',
      reference_number: null,
      transaction_date: '2024-01-15',
      created_by: 'user-1',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      deleted_at: null,
    } as FinancialTransaction,
    {
      id: '2',
      condominium_id: 'condo-1',
      account_id: 'account-2',
      category_id: 'category-1',
      type: 'income',
      status: 'pending',
      amount: 50,
      original_currency: 'USD',
      exchange_rate: 1,
      base_amount: 50,
      base_currency: 'USD',
      description: 'Extra fee',
      reference_number: null,
      transaction_date: '2024-01-16',
      created_by: 'user-1',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z',
      deleted_at: null,
      _local_status: 'pending',
    } as FinancialTransaction & { _local_status: 'pending' },
  ];

  beforeEach(async () => {
    const incomesSpy = jasmine.createSpyObj('IncomesService', ['fetchIncomesByCondominium'], {
      incomes$: new BehaviorSubject<FinancialTransaction[]>(mockIncomes),
      loading$: new BehaviorSubject<boolean>(false),
    });

    const accountsSpy = jasmine.createSpyObj('CondominiumAccounts', ['fetchByCondominium'], {
      accounts$: new BehaviorSubject<CondominiumAccount[]>(mockAccounts),
    });

    await TestBed.configureTestingModule({
      imports: [IncomeListComponent],
      providers: [
        { provide: IncomesService, useValue: incomesSpy },
        { provide: CondominiumAccounts, useValue: accountsSpy },
      ],
    }).compileComponents();

    mockIncomesService = TestBed.inject(IncomesService) as jasmine.SpyObj<IncomesService>;
    mockAccountsService = TestBed.inject(CondominiumAccounts) as jasmine.SpyObj<CondominiumAccounts>;
    fixture = TestBed.createComponent(IncomeListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch incomes on init', () => {
    expect(mockIncomesService.fetchIncomesByCondominium).toHaveBeenCalledWith('condo-1');
  });

  it('should fetch accounts on init', () => {
    expect(mockAccountsService.fetchByCondominium).toHaveBeenCalledWith('condo-1');
  });

  it('should display incomes from service', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('ion-item');
    expect(items.length).toBe(2);
  });

  it('should display account name for each income', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const accountNames = compiled.querySelectorAll('.account-name');
    expect(accountNames.length).toBe(2);
    expect(accountNames[0].textContent).toContain('Main Wallet');
    expect(accountNames[1].textContent).toContain('Reserve Fund');
  });

  it('should return correct account name', () => {
    expect(component.getAccountName('account-1')).toBe('Main Wallet');
    expect(component.getAccountName('account-2')).toBe('Reserve Fund');
  });

  it('should return "Unknown Account" for unknown account id', () => {
    expect(component.getAccountName('unknown-id')).toBe('Unknown Account');
  });

  it('should show sync icon for pending income', () => {
    const pendingIncome = mockIncomes[1];
    expect(component.isPendingSync(pendingIncome)).toBeTrue();
    expect(component.getSyncIcon(pendingIncome)).toBe('sync-outline');
    expect(component.getSyncColor(pendingIncome)).toBe('warning');
  });

  it('should show checkmark for completed income', () => {
    const completedIncome = mockIncomes[0];
    expect(component.isPendingSync(completedIncome)).toBeFalse();
    expect(component.getSyncIcon(completedIncome)).toBe('checkmark-circle');
    expect(component.getSyncColor(completedIncome)).toBe('success');
  });

  it('should format date correctly', () => {
    const formatted = component.formatDate('2024-01-15');
    expect(formatted).toContain('2024');
  });

  it('should format amount correctly', () => {
    const formatted = component.formatAmount(100.5, 'USD');
    expect(formatted).toBe('100.50 USD');
  });

  it('should show loading spinner when loading', () => {
    (mockIncomesService.loading$ as BehaviorSubject<boolean>).next(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('ion-spinner')).toBeTruthy();
  });

  it('should show empty message when no incomes', () => {
    (mockIncomesService.incomes$ as BehaviorSubject<FinancialTransaction[]>).next([]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-container')).toBeTruthy();
  });
});
