import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { TransactionCardComponent } from './transaction-card.component';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Currency } from '@core/services/currency/currency';
import type { FinancialTransaction } from '@app-types/financial-transactions';

describe('TransactionCardComponent', () => {
  let component: TransactionCardComponent;
  let fixture: ComponentFixture<TransactionCardComponent>;

  const mockTransaction: FinancialTransaction = {
    id: 'tx-1',
    condominium_id: 'condo-1',
    account_id: 'account-1',
    category_id: 'category-1',
    transfer_group_id: null,
    type: 'expense',
    status: 'pending',
    amount: 50,
    original_currency: 'USD',
    exchange_rate: 1,
    base_amount: 50,
    base_currency: 'USD',
    description: 'Electricity bill',
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, TransactionCardComponent],
      providers: [
        {
          provide: CondominiumAccounts,
          useValue: { accounts$: { subscribe: () => ({ unsubscribe: () => undefined }) } },
        },
        {
          provide: TransactionCategories,
          useValue: { categories$: { subscribe: () => ({ unsubscribe: () => undefined }) } },
        },
        {
          provide: Currency,
          useValue: { currencies$: { subscribe: () => ({ unsubscribe: () => undefined }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('transaction', mockTransaction);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render description and date', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Electricity bill');
    expect(compiled.textContent).toContain('2026-07-01');
  });

  it('should format expense amount with minus sign', () => {
    expect(component.formattedAmount()).toBe('-USD50.00');
  });

  it('should format income amount with plus sign', () => {
    fixture.componentRef.setInput('transaction', { ...mockTransaction, type: 'income' });
    fixture.detectChanges();
    expect(component.formattedAmount()).toBe('+USD50.00');
  });

  it('should apply correct status color', () => {
    expect(component.statusColor()).toBe('warning');
  });

  it('should allow completing pending transactions', () => {
    expect(component.canComplete()).toBe(true);
    expect(component.canVoid()).toBe(true);
  });

  it('should not allow actions on voided transactions', () => {
    fixture.componentRef.setInput('transaction', { ...mockTransaction, status: 'voided' });
    fixture.detectChanges();
    expect(component.canComplete()).toBe(false);
    expect(component.canVoid()).toBe(false);
  });
});
