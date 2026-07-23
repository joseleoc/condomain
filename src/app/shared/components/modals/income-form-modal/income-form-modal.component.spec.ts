import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { BehaviorSubject } from 'rxjs';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Currency } from '@core/services/currency/currency';
import { IncomeFormModalComponent } from './income-form-modal.component';
import { IncomeFormValue } from '@shared/components/forms/income-form/income-form.component';

function createMockAccountsService(): CondominiumAccounts {
  return {
    accounts$: new BehaviorSubject([]),
    loading$: new BehaviorSubject(false),
    error$: new BehaviorSubject(null),
    fetchByCondominium: jasmine
      .createSpy('fetchByCondominium')
      .and.returnValue(Promise.resolve([])),
  } as unknown as CondominiumAccounts;
}

function createMockCategoriesService(): TransactionCategories {
  return {
    categories$: new BehaviorSubject([]),
    loading$: new BehaviorSubject(false),
    error$: new BehaviorSubject(null),
    fetchByCondominium: jasmine
      .createSpy('fetchByCondominium')
      .and.returnValue(Promise.resolve([])),
  } as unknown as TransactionCategories;
}

function createMockCurrencyService(): Currency {
  return {
    currencies$: new BehaviorSubject([
      { iso_code: 'USD', name: 'US Dollar', symbol: '$' },
    ]),
    loadingCurrencies$: new BehaviorSubject(false),
  } as unknown as Currency;
}

describe('IncomeFormModalComponent', () => {
  let component: IncomeFormModalComponent;
  let fixture: ComponentFixture<IncomeFormModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncomeFormModalComponent, SharedTestingModule],
      providers: [
        { provide: CondominiumAccounts, useFactory: createMockAccountsService },
        {
          provide: TransactionCategories,
          useFactory: createMockCategoriesService,
        },
        { provide: Currency, useFactory: createMockCurrencyService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.componentRef.setInput('baseCurrency', 'USD');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should pass inputs to the child form', () => {
    expect(component.condominiumId()).toBe('condo-1');
    expect(component.baseCurrency()).toBe('USD');
    expect(component.isOpen()).toBe(true);
  });

  it('should emit formSubmit and close modal on form submit', () => {
    spyOn(component.formSubmit, 'emit');
    spyOn(component.isOpenChange, 'emit');

    const value: IncomeFormValue = {
      account_id: 'account-1',
      category_id: 'category-1',
      amount: 100,
      original_currency: 'USD',
      exchange_rate: 1,
      description: 'Test',
      reference_number: null,
      transaction_date: '2026-07-01',
    };

    component.onFormSubmit(value);

    expect(component.formSubmit.emit).toHaveBeenCalledWith(value);
    expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
  });

  it('should emit isOpenChange false on cancel', () => {
    spyOn(component.isOpenChange, 'emit');
    component.cancel();
    expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
  });

  it('should call child form submit when submit is invoked', () => {
    spyOn(component.incomeForm(), 'submit');
    component.submit();
    expect(component.incomeForm().submit).toHaveBeenCalled();
  });
});
