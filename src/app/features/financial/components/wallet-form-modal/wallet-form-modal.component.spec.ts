import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { WalletFormModalComponent } from './wallet-form-modal.component';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { Currency } from '@core/services/currency/currency';
import { Toast } from '@core/services/toast/toast';
import { BehaviorSubject } from 'rxjs';
import type { Currency as TCurrency } from '@app-types/currency';
import type { CondominiumAccount } from '@app-types/condominium-accounts';

function createMockAccountsService(): CondominiumAccounts {
  return {
    accounts$: new BehaviorSubject<CondominiumAccount[]>([]),
    loading$: new BehaviorSubject<boolean>(false),
    error$: new BehaviorSubject<unknown>(null),
    fetchByCondominium: jasmine
      .createSpy('fetchByCondominium')
      .and.returnValue(Promise.resolve([])),
    getById: jasmine.createSpy('getById').and.returnValue(Promise.resolve(null)),
    create: jasmine.createSpy('create').and.callFake(
      (data: Record<string, unknown>) =>
        Promise.resolve({
          id: 'new-wallet-id',
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        }),
    ),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
  } as unknown as CondominiumAccounts;
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

function createMockToast(): Toast {
  return {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
  } as unknown as Toast;
}

describe('WalletFormModalComponent', () => {
  let component: WalletFormModalComponent;
  let fixture: ComponentFixture<WalletFormModalComponent>;
  let accountsService: CondominiumAccounts;
  let toast: Toast;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletFormModalComponent, SharedTestingModule],
      providers: [
        { provide: CondominiumAccounts, useFactory: createMockAccountsService },
        { provide: Currency, useFactory: createMockCurrencyService },
        { provide: Toast, useFactory: createMockToast },
      ],
    }).compileComponents();

    accountsService = TestBed.inject(CondominiumAccounts);
    toast = TestBed.inject(Toast);

    fixture = TestBed.createComponent(WalletFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('create mode', () => {
    it('should initialize form with default values', () => {
      expect(component.form.value.name).toBe('');
      expect(component.form.value.account_type).toBe('bank');
      expect(component.form.value.currency).toBe('');
      expect(component.form.value.institution_name).toBeNull();
      expect(component.form.value.initial_balance).toBe(0);
      expect(component.form.value.icon).toBeNull();
      expect(component.form.value.color).toBeNull();
    });

    it('should require name', () => {
      component.form.patchValue({ name: '' });
      expect(component.form.valid).toBe(false);
      expect(component.form.controls.name.hasError('required')).toBe(true);
    });

    it('should require balance >= 0', () => {
      component.form.patchValue({
        name: 'Valid Name',
        currency: 'USD',
        initial_balance: -10,
      });
      expect(component.form.valid).toBe(false);
      expect(component.form.controls.initial_balance.hasError('min')).toBe(
        true,
      );
    });

    it('should call create service on valid submit', async () => {
      component.form.patchValue({
        name: 'Cash Wallet',
        account_type: 'cash',
        currency: 'USD',
        institution_name: 'My Bank',
        initial_balance: 500,
      });

      await component.submit();

      expect(accountsService.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          condominium_id: 'condo-1',
          name: 'Cash Wallet',
          account_type: 'cash',
          currency: 'USD',
          institution_name: 'My Bank',
          initial_balance: 500,
        }),
      );
    });

    it('should dismiss modal after successful create', async () => {
      spyOn(component.isOpenChange, 'emit');
      component.form.patchValue({
        name: 'Cash Wallet',
        currency: 'USD',
      });

      await component.submit();

      expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
    });

    it('should show toast after successful create', async () => {
      component.form.patchValue({
        name: 'Cash Wallet',
        currency: 'USD',
      });

      await component.submit();

      expect(toast.present).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'financial.wallets.toast.created',
          color: 'success',
        }),
      );
    });
  });

  describe('edit mode', () => {
    const mockAccount: CondominiumAccount = {
      id: 'wallet-1',
      condominium_id: 'condo-1',
      name: 'Existing Wallet',
      account_type: 'bank',
      currency: 'VES',
      institution_name: 'Bank of America',
      initial_balance: 1000,
      current_balance: 1000,
      icon: null,
      color: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    beforeEach(() => {
      fixture.componentRef.setInput('account', mockAccount);
      fixture.detectChanges();
    });

    it('should initialize form with account values', () => {
      expect(component.form.value.name).toBe('Existing Wallet');
      expect(component.form.value.account_type).toBe('bank');
      expect(component.form.value.currency).toBe('VES');
      expect(component.form.value.institution_name).toBe('Bank of America');
      expect(component.form.value.initial_balance).toBe(1000);
    });

    it('should call update service on valid submit', async () => {
      component.form.patchValue({ name: 'Updated Wallet' });

      await component.submit();

      expect(accountsService.update).toHaveBeenCalledWith(
        'wallet-1',
        jasmine.objectContaining({
          name: 'Updated Wallet',
          account_type: 'bank',
          currency: 'VES',
          institution_name: 'Bank of America',
          initial_balance: 1000,
        }),
      );
    });

    it('should dismiss modal after successful update', async () => {
      spyOn(component.isOpenChange, 'emit');
      await component.submit();

      expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
    });

    it('should show toast after successful update', async () => {
      await component.submit();

      expect(toast.present).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'financial.wallets.toast.updated',
          color: 'success',
        }),
      );
    });
  });

  describe('cancel', () => {
    it('should emit isOpenChange false', () => {
      spyOn(component.isOpenChange, 'emit');
      component.cancel();
      expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
    });
  });

  describe('invalid submit', () => {
    it('should not call service when form is invalid', async () => {
      component.form.patchValue({ name: '' });
      await component.submit();
      expect(accountsService.create).not.toHaveBeenCalled();
      expect(accountsService.update).not.toHaveBeenCalled();
    });
  });
});
