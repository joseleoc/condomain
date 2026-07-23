import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletCardComponent } from './wallet-card.component';
import type { CondominiumAccount } from '@app-types/condominium-accounts';

function createMockAccount(
  overrides: Partial<CondominiumAccount> = {},
): CondominiumAccount {
  return {
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
    ...overrides,
  };
}

describe('WalletCardComponent', () => {
  let component: WalletCardComponent;
  let fixture: ComponentFixture<WalletCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('account', createMockAccount());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the wallet name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.wallet-name')?.textContent).toContain('Main Bank Account');
  });

  it('should display the institution name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.wallet-subtitle')?.textContent).toContain('Bank of America');
  });

  it('should display the current balance formatted with currency code', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.balance-amount')?.textContent).toContain('1,250.50');
    expect(compiled.querySelector('.balance-currency')?.textContent).toContain('USD');
  });

  it('should map account_type to the correct icon', () => {
    expect(component.iconName()).toBe('business');
  });

  it('should use account icon when provided', () => {
    fixture.componentRef.setInput(
      'account',
      createMockAccount({ icon: 'card-outline' }),
    );
    fixture.detectChanges();

    expect(component.iconName()).toBe('card-outline');
  });

  it('should fallback to wallet-outline when icon and account_type are missing', () => {
    fixture.componentRef.setInput(
      'account',
      createMockAccount({ icon: null, account_type: 'unknown' as any }),
    );
    fixture.detectChanges();

    expect(component.iconName()).toBe('wallet-outline');
  });

  it('should default accent color to primary', () => {
    expect(component.accentColor()).toBe('var(--ion-color-primary)');
  });

  it('should use account color when provided', () => {
    fixture.componentRef.setInput(
      'account',
      createMockAccount({ color: '#ff0000' }),
    );
    fixture.detectChanges();

    expect(component.accentColor()).toBe('#ff0000');
  });

  it('should show shimmer skeleton when loading', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.wallet-row.shimmer')).toBeTruthy();
    expect(compiled.querySelector('.shimmer-circle')).toBeTruthy();
  });

  it('should add has-error class when hasError is true', () => {
    fixture.componentRef.setInput('hasError', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.wallet-row.has-error')).toBeTruthy();
  });

  it('should format negative balance with minus sign and absolute value', () => {
    fixture.componentRef.setInput(
      'account',
      createMockAccount({ current_balance: -1200 }),
    );
    fixture.detectChanges();

    expect(component.formattedBalance()).toBe('-1,200.00');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.balance-amount.negative')).toBeTruthy();
  });

  it('should compute iconBgColor from account color', () => {
    fixture.componentRef.setInput(
      'account',
      createMockAccount({ color: '#ff8200' }),
    );
    fixture.detectChanges();

    expect(component.iconBgColor()).toBe('rgba(255, 130, 0, 0.12)');
  });

  it('should default iconBgColor to ion-color-light when no color', () => {
    expect(component.iconBgColor()).toBe('var(--ion-color-light)');
  });

  describe('icon mapping', () => {
    it('should render cash icon for cash account type', () => {
      fixture.componentRef.setInput(
        'account',
        createMockAccount({ account_type: 'cash' }),
      );
      fixture.detectChanges();

      expect(component.iconName()).toBe('cash');
    });

    it('should render wallet icon for wallet account type', () => {
      fixture.componentRef.setInput(
        'account',
        createMockAccount({ account_type: 'wallet' }),
      );
      fixture.detectChanges();

      expect(component.iconName()).toBe('wallet');
    });

    it('should render card icon for credit account type', () => {
      fixture.componentRef.setInput(
        'account',
        createMockAccount({ account_type: 'credit' }),
      );
      fixture.detectChanges();

      expect(component.iconName()).toBe('card');
    });

    it('should render trending-up icon for investment account type', () => {
      fixture.componentRef.setInput(
        'account',
        createMockAccount({ account_type: 'investment' }),
      );
      fixture.detectChanges();

      expect(component.iconName()).toBe('trending-up');
    });
  });
});
