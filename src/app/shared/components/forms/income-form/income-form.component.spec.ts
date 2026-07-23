import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { BehaviorSubject } from 'rxjs';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Currency } from '@core/services/currency/currency';
import {
  IncomeFormComponent,
  IncomeFormValue,
} from './income-form.component';
import type { CondominiumAccount } from '@app-types/condominium-accounts';
import type { TransactionCategory } from '@app-types/transaction-categories';
import type { Currency as TCurrency } from '@app-types/currency';

function createMockAccountsService(): CondominiumAccounts {
  return {
    accounts$: new BehaviorSubject<CondominiumAccount[]>([]),
    loading$: new BehaviorSubject<boolean>(false),
    error$: new BehaviorSubject<unknown>(null),
    fetchByCondominium: jasmine
      .createSpy('fetchByCondominium')
      .and.returnValue(Promise.resolve([])),
    getById: jasmine.createSpy('getById').and.returnValue(Promise.resolve(null)),
    create: jasmine.createSpy('create').and.returnValue(Promise.resolve({})),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
  } as unknown as CondominiumAccounts;
}

function createMockCategoriesService(): TransactionCategories {
  return {
    categories$: new BehaviorSubject<TransactionCategory[]>([]),
    loading$: new BehaviorSubject<boolean>(false),
    error$: new BehaviorSubject<unknown>(null),
    fetchByCondominium: jasmine
      .createSpy('fetchByCondominium')
      .and.returnValue(Promise.resolve([])),
    fetchByType: jasmine
      .createSpy('fetchByType')
      .and.returnValue(Promise.resolve([])),
    fetchChildren: jasmine
      .createSpy('fetchChildren')
      .and.returnValue(Promise.resolve([])),
    create: jasmine.createSpy('create').and.returnValue(Promise.resolve({})),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
  } as unknown as TransactionCategories;
}

function createMockCurrencyService(): Currency {
  return {
    currencies$: new BehaviorSubject<TCurrency[]>([
      {
        iso_code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        minor_unit: 2,
        created_at: '',
        updated_at: '',
      },
      {
        iso_code: 'VES',
        name: 'Bolívar',
        symbol: 'Bs.',
        minor_unit: 2,
        created_at: '',
        updated_at: '',
      },
    ]),
    loadingCurrencies$: new BehaviorSubject<boolean>(false),
    fetchCurrencies: jasmine
      .createSpy('fetchCurrencies')
      .and.returnValue(Promise.resolve()),
  } as unknown as Currency;
}

function createValidFormValue(): IncomeFormValue {
  return {
    account_id: 'account-1',
    category_id: 'category-1',
    amount: 100,
    original_currency: 'USD',
    exchange_rate: 1,
    description: 'Monthly fee',
    reference_number: 'REF-001',
    transaction_date: '2026-07-01',
  };
}

describe('IncomeFormComponent', () => {
  let component: IncomeFormComponent;
  let fixture: ComponentFixture<IncomeFormComponent>;
  let accountsService: CondominiumAccounts;
  let categoriesService: TransactionCategories;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncomeFormComponent, SharedTestingModule],
      providers: [
        { provide: CondominiumAccounts, useFactory: createMockAccountsService },
        {
          provide: TransactionCategories,
          useFactory: createMockCategoriesService,
        },
        { provide: Currency, useFactory: createMockCurrencyService },
      ],
    }).compileComponents();

    accountsService = TestBed.inject(CondominiumAccounts);
    categoriesService = TestBed.inject(TransactionCategories);

    fixture = TestBed.createComponent(IncomeFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.componentRef.setInput('baseCurrency', 'USD');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.form.value.account_id).toBe('');
    expect(component.form.value.category_id).toBe('');
    expect(component.form.value.amount).toBe(0);
    expect(component.form.value.original_currency).toBe('USD');
    expect(component.form.value.exchange_rate).toBe(1);
    expect(component.form.value.description).toBe('');
    expect(component.form.value.reference_number).toBeNull();
    expect(component.form.value.transaction_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should fetch accounts and categories when condominiumId is set', () => {
    expect(accountsService.fetchByCondominium).toHaveBeenCalledWith('condo-1');
    expect(categoriesService.fetchByCondominium).toHaveBeenCalledWith('condo-1');
  });

  it('should filter available accounts by condominiumId', () => {
    (accountsService.accounts$ as BehaviorSubject<CondominiumAccount[]>).next([
      {
        id: 'account-1',
        condominium_id: 'condo-1',
        name: 'Account 1',
        account_type: 'bank',
        currency: 'USD',
        institution_name: null,
        initial_balance: 0,
        current_balance: 0,
        icon: null,
        color: null,
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
      {
        id: 'account-2',
        condominium_id: 'condo-2',
        name: 'Account 2',
        account_type: 'cash',
        currency: 'USD',
        institution_name: null,
        initial_balance: 0,
        current_balance: 0,
        icon: null,
        color: null,
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
    ]);

    expect(component.availableAccounts().length).toBe(1);
    expect(component.availableAccounts()[0].id).toBe('account-1');
  });

  it('should filter available categories by income type and condominiumId', () => {
    (categoriesService.categories$ as BehaviorSubject<TransactionCategory[]>).next([
      {
        id: 'cat-income',
        condominium_id: 'condo-1',
        parent_id: null,
        name: 'Income Category',
        category_type: 'income',
        icon: null,
        color: null,
        is_system: false,
        i18n_key: null,
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
      {
        id: 'cat-expense',
        condominium_id: 'condo-1',
        parent_id: null,
        name: 'Expense Category',
        category_type: 'expense',
        icon: null,
        color: null,
        is_system: false,
        i18n_key: null,
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
      {
        id: 'cat-other-condo',
        condominium_id: 'condo-2',
        parent_id: null,
        name: 'Other Condo Income',
        category_type: 'income',
        icon: null,
        color: null,
        is_system: false,
        i18n_key: null,
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
    ]);

    expect(component.availableCategories().length).toBe(1);
    expect(component.availableCategories()[0].id).toBe('cat-income');
  });

  it('should mark form invalid when required fields are empty', () => {
    component.form.reset();
    expect(component.form.valid).toBe(false);
    expect(component.form.controls.account_id.valid).toBe(false);
    expect(component.form.controls.category_id.valid).toBe(false);
    expect(component.form.controls.amount.valid).toBe(false);
    expect(component.form.controls.original_currency.valid).toBe(false);
    expect(component.form.controls.description.valid).toBe(false);
    expect(component.form.controls.transaction_date.valid).toBe(false);
  });

  it('should mark form valid with valid data', () => {
    component.form.setValue(createValidFormValue());
    expect(component.form.valid).toBe(true);
  });

  it('should validate amount minimum value', () => {
    component.form.patchValue({ amount: 0 });
    expect(component.form.controls.amount.hasError('min')).toBe(true);

    component.form.patchValue({ amount: 0.01 });
    expect(component.form.controls.amount.hasError('min')).toBe(false);
  });

  it('should reject future transaction dates', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    component.form.patchValue({
      transaction_date: tomorrow.toISOString().split('T')[0],
    });
    expect(component.form.controls.transaction_date.hasError('futureDate')).toBe(
      true,
    );
  });

  it('should accept today as transaction date', () => {
    const today = new Date().toISOString().split('T')[0];
    component.form.patchValue({ transaction_date: today });
    expect(component.form.controls.transaction_date.hasError('futureDate')).toBe(
      false,
    );
  });

  it('should hide exchange rate when currency matches base', () => {
    component.form.patchValue({ original_currency: 'USD' });
    fixture.detectChanges();
    expect(component.showExchangeRate()).toBe(false);
  });

  it('should show exchange rate when currency differs from base', () => {
    component.form.patchValue({ original_currency: 'VES' });
    fixture.detectChanges();
    expect(component.showExchangeRate()).toBe(true);
  });

  it('should reset exchange rate to 1 when currency changes to base', fakeAsync(() => {
    component.form.patchValue({ original_currency: 'VES', exchange_rate: 50 });
    tick();
    expect(component.form.value.exchange_rate).toBe(50);

    component.form.patchValue({ original_currency: 'USD' });
    tick();
    expect(component.form.value.exchange_rate).toBe(1);
  }));

  it('should emit formSubmit with valid data and reset the form', () => {
    spyOn(component.formSubmit, 'emit');
    component.form.setValue(createValidFormValue());

    component.submit();

    expect(component.formSubmit.emit).toHaveBeenCalledWith(
      jasmine.objectContaining(createValidFormValue()),
    );
    expect(component.form.value.account_id).toBe('');
  });

  it('should mark all controls touched and not emit when form is invalid', () => {
    spyOn(component.formSubmit, 'emit');
    component.form.reset();

    component.submit();

    expect(component.formSubmit.emit).not.toHaveBeenCalled();
    expect(component.form.controls.account_id.touched).toBe(true);
  });

  it('should emit cancelled event and reset the form', () => {
    spyOn(component.cancelled, 'emit');
    component.form.patchValue({ description: 'Test' });

    component.onCancel();

    expect(component.cancelled.emit).toHaveBeenCalled();
    expect(component.form.value.description).toBe('');
  });

  it('should keep reference_number optional', () => {
    const value = createValidFormValue();
    value.reference_number = null;
    component.form.setValue(value);
    expect(component.form.valid).toBe(true);
  });
});
