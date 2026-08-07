import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseFormComponent, ExpenseFormValue } from './expense-form.component';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Currency } from '@core/services/currency/currency';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('ExpenseFormComponent', () => {
  let component: ExpenseFormComponent;
  let fixture: ComponentFixture<ExpenseFormComponent>;
  let accountsServiceSpy: jasmine.SpyObj<CondominiumAccounts>;
  let categoriesServiceSpy: jasmine.SpyObj<TransactionCategories>;
  let currencyServiceSpy: jasmine.SpyObj<Currency>;

  const mockAccounts = [
    { id: 'account-1', name: 'Main Wallet', condominium_id: 'condo-1' },
    { id: 'account-2', name: 'Savings', condominium_id: 'condo-1' },
  ];

  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Maintenance',
      category_type: 'expense' as const,
      condominium_id: 'condo-1',
    },
    {
      id: 'cat-2',
      name: 'Utilities',
      category_type: 'expense' as const,
      condominium_id: 'condo-1',
    },
    {
      id: 'cat-3',
      name: 'Condo Fees',
      category_type: 'income' as const,
      condominium_id: 'condo-1',
    },
  ];

  const mockCurrencies = [
    { iso_code: 'USD', name: 'US Dollar', symbol: '$' },
    { iso_code: 'EUR', name: 'Euro', symbol: '€' },
  ];

  beforeEach(async () => {
    const accSpy = jasmine.createSpyObj('CondominiumAccounts', ['fetchByCondominium'], {
      accounts$: new BehaviorSubject(mockAccounts),
    });

    const catSpy = jasmine.createSpyObj('TransactionCategories', ['fetchByCondominium'], {
      categories$: new BehaviorSubject(mockCategories),
    });

    const curSpy = jasmine.createSpyObj('Currency', [], {
      currencies$: new BehaviorSubject(mockCurrencies),
    });

    const translocoSpy = jasmine.createSpyObj('TranslocoService', ['translate']);
    translocoSpy.translate.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [ExpenseFormComponent],
      providers: [
        { provide: CondominiumAccounts, useValue: accSpy },
        { provide: TransactionCategories, useValue: catSpy },
        { provide: Currency, useValue: curSpy },
        { provide: TranslocoService, useValue: translocoSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpenseFormComponent);
    component = fixture.componentInstance;

    accountsServiceSpy = TestBed.inject(
      CondominiumAccounts,
    ) as jasmine.SpyObj<CondominiumAccounts>;
    categoriesServiceSpy = TestBed.inject(
      TransactionCategories,
    ) as jasmine.SpyObj<TransactionCategories>;
    currencyServiceSpy = TestBed.inject(Currency) as jasmine.SpyObj<Currency>;

    // Set required inputs
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.componentRef.setInput('baseCurrency', 'USD');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should fetch accounts and categories', () => {
      expect(accountsServiceSpy.fetchByCondominium).toHaveBeenCalledWith('condo-1');
      expect(categoriesServiceSpy.fetchByCondominium).toHaveBeenCalledWith('condo-1');
    });

    it('should set default currency to baseCurrency', () => {
      expect(component.form.controls.original_currency.value).toBe('USD');
    });
  });

  describe('availableCategories', () => {
    it('should filter categories by type=expense', () => {
      const categories = component.availableCategories();

      expect(categories.length).toBe(2);
      expect(categories.every((c) => c.category_type === 'expense')).toBeTrue();
    });

    it('should exclude income categories', () => {
      const categories = component.availableCategories();

      expect(categories.find((c) => c.category_type === 'income')).toBeUndefined();
    });

    it('should filter by condominium_id', () => {
      const categories = component.availableCategories();

      expect(categories.every((c) => c.condominium_id === 'condo-1')).toBeTrue();
    });
  });

  describe('showExchangeRate', () => {
    it('should be false when currency equals baseCurrency', () => {
      component.form.patchValue({ original_currency: 'USD' });
      fixture.detectChanges();

      expect(component.showExchangeRate()).toBeFalse();
    });

    it('should be true when currency differs from baseCurrency', () => {
      component.form.patchValue({ original_currency: 'EUR' });
      fixture.detectChanges();

      expect(component.showExchangeRate()).toBeTrue();
    });
  });

  describe('form validation', () => {
    it('should be invalid when required fields are empty', () => {
      expect(component.form.valid).toBeFalse();
    });

    it('should reject amount less than 0.01', () => {
      component.form.patchValue({
        account_id: 'account-1',
        category_id: 'cat-1',
        amount: 0.001,
        original_currency: 'USD',
        description: 'Test',
        transaction_date: '2026-01-01',
      });

      expect(component.form.controls.amount.valid).toBeFalse();
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      component.form.patchValue({
        account_id: 'account-1',
        category_id: 'cat-1',
        amount: 100,
        original_currency: 'USD',
        description: 'Test',
        transaction_date: futureDateStr,
      });

      expect(component.form.controls.transaction_date.valid).toBeFalse();
      expect(component.form.controls.transaction_date.errors?.['futureDate']).toBeTrue();
    });

    it('should accept valid form', () => {
      component.form.patchValue({
        account_id: 'account-1',
        category_id: 'cat-1',
        amount: 100,
        original_currency: 'USD',
        description: 'Test expense',
        transaction_date: '2026-01-01',
      });

      expect(component.form.valid).toBeTrue();
    });
  });

  describe('submit', () => {
    it('should emit formSubmit when form is valid', () => {
      spyOn(component.formSubmit, 'emit');

      component.form.patchValue({
        account_id: 'account-1',
        category_id: 'cat-1',
        amount: 100,
        original_currency: 'USD',
        description: 'Test expense',
        transaction_date: '2026-01-01',
      });

      component.submit();

      expect(component.formSubmit.emit).toHaveBeenCalledWith(
        jasmine.objectContaining({
          account_id: 'account-1',
          category_id: 'cat-1',
          amount: 100,
          original_currency: 'USD',
          description: 'Test expense',
          transaction_date: '2026-01-01',
        }),
      );
    });

    it('should not emit formSubmit when form is invalid', () => {
      spyOn(component.formSubmit, 'emit');

      component.submit();

      expect(component.formSubmit.emit).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched when form is invalid', () => {
      spyOn(component.form.controls.account_id, 'markAsTouched');
      spyOn(component.form.controls.category_id, 'markAsTouched');

      component.submit();

      expect(component.form.controls.account_id.markAsTouched).toHaveBeenCalled();
      expect(component.form.controls.category_id.markAsTouched).toHaveBeenCalled();
    });
  });

  describe('onCancel', () => {
    it('should emit cancelled', () => {
      spyOn(component.cancelled, 'emit');

      component.onCancel();

      expect(component.cancelled.emit).toHaveBeenCalled();
    });

    it('should reset form', () => {
      component.form.patchValue({
        account_id: 'account-1',
        amount: 100,
      });

      component.onCancel();

      expect(component.form.controls.account_id.value).toBe('');
      expect(component.form.controls.amount.value).toBe(0);
    });
  });

  describe('resetForm', () => {
    it('should reset form to initial values', () => {
      component.form.patchValue({
        account_id: 'account-1',
        category_id: 'cat-1',
        amount: 100,
        description: 'Test',
      });

      component.resetForm();

      expect(component.form.controls.account_id.value).toBe('');
      expect(component.form.controls.category_id.value).toBe('');
      expect(component.form.controls.amount.value).toBe(0);
      expect(component.form.controls.description.value).toBe('');
      expect(component.form.controls.original_currency.value).toBe('USD');
    });
  });

  describe('currency change', () => {
    it('should set exchange_rate to 1 when currency equals baseCurrency', () => {
      component.form.patchValue({ original_currency: 'USD' });

      expect(component.form.controls.exchange_rate.value).toBe(1);
    });

    it('should require exchange_rate when currency differs from baseCurrency', () => {
      component.form.patchValue({ original_currency: 'EUR' });

      expect(component.form.controls.exchange_rate.hasValidator(jasmine.anything())).toBeTrue();
    });
  });
});
