import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { BehaviorSubject } from 'rxjs';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Currency } from '@core/services/currency/currency';
import { IncomeFormModalComponent } from './income-form-modal.component';
import { IncomeFormValue } from '@shared/components/forms/income-form/income-form.component';
import { IncomesService } from '@core/services/incomes/incomes.service';
import { Toast } from '@core/services/toast/toast';

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

function createMockIncomesService(): IncomesService {
  return {
    createIncome: jasmine.createSpy('createIncome').and.returnValue(Promise.resolve({})),
  } as unknown as IncomesService;
}

function createMockToast(): Toast {
  return {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
  } as unknown as Toast;
}

describe('IncomeFormModalComponent', () => {
  let component: IncomeFormModalComponent;
  let fixture: ComponentFixture<IncomeFormModalComponent>;
  let incomesService: IncomesService;
  let toast: Toast;

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
        { provide: IncomesService, useFactory: createMockIncomesService },
        { provide: Toast, useFactory: createMockToast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.componentRef.setInput('baseCurrency', 'USD');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    incomesService = TestBed.inject(IncomesService);
    toast = TestBed.inject(Toast);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should pass inputs to the child form', () => {
    expect(component.condominiumId()).toBe('condo-1');
    expect(component.baseCurrency()).toBe('USD');
    expect(component.isOpen()).toBe(true);
  });

  it('should call incomesService.createIncome on form submit', async () => {
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

    await component.onFormSubmit(value);

    expect(incomesService.createIncome).toHaveBeenCalledWith({
      condominium_id: 'condo-1',
      account_id: 'account-1',
      category_id: 'category-1',
      amount: 100,
      original_currency: 'USD',
      exchange_rate: 1,
      description: 'Test',
      reference_number: null,
      transaction_date: '2026-07-01',
    });
  });

  it('should close modal on successful submission', async () => {
    spyOn(component.isOpenChange, 'emit');
    spyOn(component.formSubmit, 'emit');
    spyOn(component.incomeForm(), 'resetForm');

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

    await component.onFormSubmit(value);

    expect(component.formSubmit.emit).toHaveBeenCalledWith(value);
    expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
    expect(component.incomeForm().resetForm).toHaveBeenCalled();
    expect(toast.present).toHaveBeenCalledWith(
      jasmine.objectContaining({
        color: 'success',
        duration: 2000,
      })
    );
  });

  it('should not close modal on error', async () => {
    spyOn(component.isOpenChange, 'emit');
    spyOn(component.formSubmit, 'emit');
    spyOn(component.incomeForm(), 'resetForm');

    // Mock error
    (incomesService.createIncome as jasmine.Spy).and.returnValue(
      Promise.reject({
        code: '23505',
        message: 'duplicate key value violates unique constraint "reference_unique_active"',
      })
    );

    const value: IncomeFormValue = {
      account_id: 'account-1',
      category_id: 'category-1',
      amount: 100,
      original_currency: 'USD',
      exchange_rate: 1,
      description: 'Test',
      reference_number: 'DUPLICATE',
      transaction_date: '2026-07-01',
    };

    await component.onFormSubmit(value);

    expect(component.formSubmit.emit).not.toHaveBeenCalled();
    expect(component.isOpenChange.emit).not.toHaveBeenCalled();
    expect(component.incomeForm().resetForm).not.toHaveBeenCalled();
    expect(toast.present).toHaveBeenCalledWith(
      jasmine.objectContaining({
        color: 'danger',
        duration: 3000,
      })
    );
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
