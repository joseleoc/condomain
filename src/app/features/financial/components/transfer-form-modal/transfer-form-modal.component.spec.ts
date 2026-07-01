import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { TransferFormModalComponent } from './transfer-form-modal.component';
import { FinancialTransactions } from '@core/services/financial-transactions/financial-transactions';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { Currency } from '@core/services/currency/currency';
import { Toast } from '@core/services/toast/toast';
import { BehaviorSubject } from 'rxjs';

describe('TransferFormModalComponent', () => {
  let component: TransferFormModalComponent;
  let fixture: ComponentFixture<TransferFormModalComponent>;
  let transactionsServiceSpy: jasmine.SpyObj<FinancialTransactions>;

  beforeEach(async () => {
    transactionsServiceSpy = jasmine.createSpyObj('FinancialTransactions', ['createTransfer']);

    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, TransferFormModalComponent],
      providers: [
        { provide: FinancialTransactions, useValue: transactionsServiceSpy },
        {
          provide: CondominiumAccounts,
          useValue: {
            accounts$: new BehaviorSubject([
              { id: 'account-1', name: 'Cash', condominium_id: 'condo-1' },
              { id: 'account-2', name: 'Bank', condominium_id: 'condo-1' },
            ]),
            fetchByCondominium: () => Promise.resolve([]),
          },
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

    fixture = TestBed.createComponent(TransferFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.componentRef.setInput('baseCurrency', 'USD');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should mark form invalid when source and destination are the same', () => {
    component.form.setValue({
      from_account_id: 'account-1',
      to_account_id: 'account-1',
      amount: 100,
      original_currency: 'USD',
      exchange_rate: 1,
      description: 'Transfer',
      transaction_date: '2026-07-01',
    });
    expect(component.form.valid).toBe(false);
    expect(component.form.hasError('sameAccount')).toBe(true);
  });

  it('should exclude source account from destination options', () => {
    component.form.patchValue({ from_account_id: 'account-1' });
    fixture.detectChanges();
    expect(component.availableDestinationAccounts().length).toBe(1);
    expect(component.availableDestinationAccounts()[0].id).toBe('account-2');
  });

  it('should call createTransfer on valid submit', async () => {
    transactionsServiceSpy.createTransfer.and.returnValue(Promise.resolve([]));

    component.form.setValue({
      from_account_id: 'account-1',
      to_account_id: 'account-2',
      amount: 100,
      original_currency: 'USD',
      exchange_rate: 1,
      description: 'Transfer',
      transaction_date: '2026-07-01',
    });

    await component.submit();

    expect(transactionsServiceSpy.createTransfer).toHaveBeenCalled();
  });
});
