import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { signal, type Signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FinancialDashboardPage } from './dashboard.page';
import {
  FinancialDashboardService,
  type NetWorthDataPoint,
} from '../../data/services/financial-dashboard.service';
import { ContextService } from '@core/services/context/context.service';
import { Toast } from '@core/services/toast/toast';
import type { CondominiumAccount } from '@app-types/condominium-accounts';
import type { CondominiumWithRole } from '@app-types/condominium';

describe('FinancialDashboardPage', () => {
  let component: FinancialDashboardPage;
  let fixture: ComponentFixture<FinancialDashboardPage>;
  let dashboardService: jasmine.SpyObj<FinancialDashboardService>;
  let toast: Toast;

  const loading$ = new BehaviorSubject<boolean>(false);
  const error$ = new BehaviorSubject<unknown>(null);
  const isEmpty$ = new BehaviorSubject<boolean>(true);
  const netWorth$ = new BehaviorSubject<number>(0);
  const wallets$ = new BehaviorSubject<CondominiumAccount[]>([]);
  const netWorthHistory$ = new BehaviorSubject<NetWorthDataPoint[]>([]);
  const selectedDuration = signal('1m') as Signal<'1m'>;

  const mockCondominium: CondominiumWithRole = {
    id: 'condo-1',
    name: 'Test Condominium',
    address: '123 Test St',
    currency: 'USD',
    owner_id: 'owner-1',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    role_id: 'role-1',
  };

  const mockAccount: CondominiumAccount = {
    id: 'wallet-1',
    condominium_id: 'condo-1',
    name: 'Main Account',
    account_type: 'bank',
    currency: 'USD',
    institution_name: 'Test Bank',
    initial_balance: 1000,
    current_balance: 1200,
    icon: null,
    color: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  beforeEach(async () => {
    dashboardService = jasmine.createSpyObj<FinancialDashboardService>(
      'FinancialDashboardService',
      ['loadData', 'setDuration', 'enableMockData'],
      {
        netWorth$: netWorth$.asObservable(),
        wallets$: wallets$.asObservable(),
        netWorthHistory$: netWorthHistory$.asObservable(),
        loading$: loading$.asObservable(),
        error$: error$.asObservable(),
        isEmpty$: isEmpty$.asObservable(),
        selectedDuration,
      },
    );
    dashboardService.loadData.and.returnValue(Promise.resolve());
    dashboardService.enableMockData.and.returnValue(undefined);

    await TestBed.configureTestingModule({
      imports: [FinancialDashboardPage, SharedTestingModule],
      providers: [
        { provide: FinancialDashboardService, useValue: dashboardService },
        {
          provide: ContextService,
          useValue: {
            activeCondominium: signal(mockCondominium) as Signal<CondominiumWithRole | null>,
            isAdmin: signal(true) as Signal<boolean>,
            isReady: signal(true) as Signal<boolean>,
          },
        },
        {
          provide: Toast,
          useValue: {
            present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
          },
        },
      ],
    }).compileComponents();

    toast = TestBed.inject(Toast);

    fixture = TestBed.createComponent(FinancialDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    loading$.complete();
    error$.complete();
    isEmpty$.complete();
    netWorth$.complete();
    wallets$.complete();
    netWorthHistory$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load dashboard data when active condominium changes', () => {
    expect(dashboardService.loadData).toHaveBeenCalled();
  });

  it('should show skeleton state when loading', () => {
    loading$.next(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.dashboard-skeleton')).toBeTruthy();
    expect(compiled.querySelectorAll('app-wallet-card').length).toBe(3);
  });

  it('should show error state with retry button', () => {
    loading$.next(false);
    error$.next(new Error('Load failed'));
    isEmpty$.next(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-state')).toBeTruthy();
    expect(compiled.textContent).toContain('financial.dashboard.error.title');
    expect(compiled.textContent).toContain('financial.dashboard.error.retry');
  });

  it('should retry loading when retry button is clicked', () => {
    loading$.next(false);
    error$.next(new Error('Load failed'));
    isEmpty$.next(false);
    fixture.detectChanges();

    component.retryLoad();

    expect(dashboardService.loadData).toHaveBeenCalledTimes(2);
  });

  it('should show empty state when no wallets exist', () => {
    loading$.next(false);
    error$.next(null);
    isEmpty$.next(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
    expect(compiled.textContent).toContain('financial.dashboard.empty.title');
    expect(compiled.textContent).toContain(
      'financial.dashboard.empty.createButton',
    );
  });

  it('should show populated state with wallet cards', () => {
    loading$.next(false);
    error$.next(null);
    isEmpty$.next(false);
    wallets$.next([mockAccount]);
    netWorth$.next(1200);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.dashboard-content')).toBeTruthy();
    expect(compiled.querySelector('app-net-worth-card')).toBeTruthy();
    expect(compiled.querySelector('app-net-worth-chart')).toBeTruthy();
    expect(compiled.querySelectorAll('app-wallet-card').length).toBe(1);
  });

  it('should open create wallet modal on FAB click', () => {
    component.openCreateWalletModal();
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.walletToEdit()).toBeNull();
  });

  it('should open edit wallet modal when edit is triggered', () => {
    component.openEditWalletModal(mockAccount);
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.walletToEdit()?.id).toBe('wallet-1');
  });

  it('should update duration when chart duration changes', () => {
    component.onDurationChange('3m');
    expect(dashboardService.setDuration).toHaveBeenCalledWith('3m');
  });

  it('should set delete target when delete is requested', () => {
    component.confirmDeleteWallet(mockAccount);
    expect(component.deleteTarget()?.id).toBe('wallet-1');
  });

  it('should show toast after delete confirmation', async () => {
    component.confirmDeleteWallet(mockAccount);
    await component.executeDelete();

    expect(toast.present).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'financial.wallets.toast.deleted',
        color: 'success',
      }),
    );
  });

  it('should clear delete target after delete', async () => {
    component.confirmDeleteWallet(mockAccount);
    await component.executeDelete();

    expect(component.deleteTarget()).toBeNull();
  });
});
