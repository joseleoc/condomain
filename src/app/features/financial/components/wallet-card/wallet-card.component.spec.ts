import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
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
      imports: [WalletCardComponent, SharedTestingModule],
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
    expect(compiled.textContent).toContain('Main Bank Account');
  });

  it('should display the institution name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Bank of America');
  });

  it('should display the current balance formatted with currency code', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('USD');
    expect(compiled.textContent).toContain('1,250.50');
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

  it('should compute the account type label key', () => {
    expect(component.accountTypeLabel()).toBe(
      'financial.wallets.accountType.bank',
    );
  });

  it('should show shimmer skeleton when loading', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.wallet-card.shimmer')).toBeTruthy();
    expect(compiled.querySelector('.skeleton-line')).toBeTruthy();
  });

  it('should show error badge when hasError is true', () => {
    fixture.componentRef.setInput('hasError', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-badge')).toBeTruthy();
  });

  describe('icon mapping', () => {
    it('should render cash icon for cash account type', () => {
      fixture.componentRef.setInput('account', createMockAccount({ account_type: 'cash' }));
      fixture.detectChanges();

      expect(component.iconName()).toBe('cash');
    });

    it('should render wallet icon for wallet account type', () => {
      fixture.componentRef.setInput('account', createMockAccount({ account_type: 'wallet' }));
      fixture.detectChanges();

      expect(component.iconName()).toBe('wallet');
    });

    it('should render card icon for credit account type', () => {
      fixture.componentRef.setInput('account', createMockAccount({ account_type: 'credit' }));
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
