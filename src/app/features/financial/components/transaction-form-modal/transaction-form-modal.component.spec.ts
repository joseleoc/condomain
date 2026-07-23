import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { TransactionFormModalComponent } from './transaction-form-modal.component';
import { FinancialTransactions } from '@core/services/financial-transactions/financial-transactions';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Currency } from '@core/services/currency/currency';
import { Toast } from '@core/services/toast/toast';
import { BehaviorSubject } from 'rxjs';

describe('TransactionFormModalComponent', () => {
  let component: TransactionFormModalComponent;
  let fixture: ComponentFixture<TransactionFormModalComponent>;
  let transactionsServiceSpy: jasmine.SpyObj<FinancialTransactions>;

  beforeEach(async () => {
    transactionsServiceSpy = jasmine.createSpyObj('FinancialTransactions', ['create', 'update']);

    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, TransactionFormModalComponent],
      providers: [
        { provide: FinancialTransactions, useValue: transactionsServiceSpy },
        {
          provide: CondominiumAccounts,
          useValue: { accounts$: new BehaviorSubject([]), fetchByCondominium: () => Promise.resolve([]) },
        },
        {
          provide: TransactionCategories,
          useValue: { categories$: new BehaviorSubject([]), fetchByCondominium: () => Promise.resolve([]) },
        },
        {
          provide: Currency,
          useValue: { currencies$: new BehaviorSubject([{ iso_code: 'USD', name: 'US Dollar', symbol: '$' }]) },
        },
        {
          provide: Toast,
          useValue: { present: () => Promise.resolve() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.componentRef.setInput('baseCurrency', 'USD');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate required fields', () => {
    component.form.reset();
    expect(component.form.valid).toBe(false);
    expect(component.form.controls.amount.valid).toBe(false);
  });

  it('should hide exchange rate when currency matches base', () => {
    component.form.patchValue({ original_currency: 'USD' });
    fixture.detectChanges();
    expect(component.showExchangeRate()).toBe(false);
  });

  it('should show exchange rate when currency differs from base', () => {
    component.form.patchValue({ original_currency: 'EUR' });
    fixture.detectChanges();
    expect(component.showExchangeRate()).toBe(true);
  });

  it('should reject future transaction dates', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    component.form.patchValue({ transaction_date: tomorrow.toISOString().split('T')[0] });
    expect(component.form.controls.transaction_date.valid).toBe(false);
  });

  it('should call create on valid submit', async () => {
    transactionsServiceSpy.create.and.returnValue(Promise.resolve({ id: 'tx-1' } as never));

    component.form.setValue({
      type: 'expense',
      account_id: 'account-1',
      category_id: 'category-1',
      amount: 100,
      original_currency: 'USD',
      exchange_rate: 1,
      description: 'Test',
      reference_number: null,
      transaction_date: '2026-07-01',
    });

    await component.submit();

    expect(transactionsServiceSpy.create).toHaveBeenCalled();
  });
});
