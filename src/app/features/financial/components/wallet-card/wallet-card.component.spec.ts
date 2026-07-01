import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { WalletCardComponent } from './wallet-card.component';
import { Currency } from '@core/services/currency/currency';
import { BehaviorSubject } from 'rxjs';
import type { Currency as TCurrency } from '@app-types/currency';
import type { CondominiumAccount } from '@app-types/condominium-accounts';

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

describe('WalletCardComponent', () => {
  let component: WalletCardComponent;
  let fixture: ComponentFixture<WalletCardComponent>;

  const mockAccount: CondominiumAccount = {
    id: 'wallet-1',
    condominium_id: 'condo-1',
    name: 'Main Bank Account',
    account_type: 'bank',
    currency: 'USD',
    institution_name: 'Bank of America',
    initial_balance: 1000,
    current_balance: 1250.5,
    icon: null,
    color: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletCardComponent, SharedTestingModule],
      providers: [{ provide: Currency, useFactory: createMockCurrencyService }],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('account', mockAccount);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the wallet name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Main Bank Account');
  });

  it('should display the institution name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Bank of America');
  });

  it('should display the current balance with currency symbol', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('$');
    expect(compiled.textContent).toContain('1250.5');
  });

  it('should map account_type to the correct icon', () => {
    expect(component.iconName()).toBe('business');
  });

  describe('icon mapping', () => {
    it('should render cash icon for cash account type', () => {
      fixture.componentRef.setInput('account', {
        ...mockAccount,
        account_type: 'cash',
      });
      fixture.detectChanges();

      expect(component.iconName()).toBe('cash');
    });

    it('should render wallet icon for wallet account type', () => {
      fixture.componentRef.setInput('account', {
        ...mockAccount,
        account_type: 'wallet',
      });
      fixture.detectChanges();

      expect(component.iconName()).toBe('wallet');
    });

    it('should render card icon for credit account type', () => {
      fixture.componentRef.setInput('account', {
        ...mockAccount,
        account_type: 'credit',
      });
      fixture.detectChanges();

      expect(component.iconName()).toBe('card');
    });

    it('should render trending-up icon for investment account type', () => {
      fixture.componentRef.setInput('account', {
        ...mockAccount,
        account_type: 'investment',
      });
      fixture.detectChanges();

      expect(component.iconName()).toBe('trending-up');
    });
  });

  describe('currency symbol resolution', () => {
    it('should resolve symbol for VES currency', () => {
      fixture.componentRef.setInput('account', {
        ...mockAccount,
        currency: 'VES',
        current_balance: 5000,
      });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Bs.');
      expect(compiled.textContent).toContain('5000');
    });

    it('should fallback to currency code when symbol is unknown', () => {
      fixture.componentRef.setInput('account', {
        ...mockAccount,
        currency: 'EUR',
        current_balance: 300,
      });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('EUR');
      expect(compiled.textContent).toContain('300');
    });
  });
});
