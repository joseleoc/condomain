import { TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { FinancialDashboardService } from './financial-dashboard.service';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { AccountBalanceService } from '@core/services/account-balance/account-balance.service';
import { ContextService } from '@core/services/context/context.service';
import { NetworkStatusService } from '@core/services/network-status/network-status.service';
import type { CondominiumAccount } from '@app-types/condominium-accounts';
import type { AccountMonthlyBalance } from '@app-types/account-balances';
import type { CondominiumWithRole } from '@app-types/condominium';

describe('FinancialDashboardService', () => {
  let service: FinancialDashboardService;
  let accountsServiceSpy: jasmine.SpyObj<CondominiumAccounts>;
  let balanceServiceSpy: jasmine.SpyObj<AccountBalanceService>;
  let activeCondominium: WritableSignal<CondominiumWithRole | null>;
  let networkStatus: WritableSignal<boolean>;

  const condominiumId = '00000000-0000-0000-0000-000000000001';

  const mockCondominium: CondominiumWithRole = {
    id: condominiumId,
    name: 'Test Condo',
    address: null,
    avatar: undefined,
    currency: 'USD',
    owner_id: '00000000-0000-0000-0000-000000000002',
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    role_id: '00000000-0000-0000-0000-000000000003',
  };

  const walletA: CondominiumAccount = {
    id: '00000000-0000-0000-0000-000000000010',
    condominium_id: condominiumId,
    name: 'Bank A',
    account_type: 'bank',
    currency: 'USD',
    institution_name: 'Bank A',
    initial_balance: 1000,
    current_balance: 1500,
    icon: null,
    color: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
  };

  const walletB: CondominiumAccount = {
    id: '00000000-0000-0000-0000-000000000011',
    condominium_id: condominiumId,
    name: 'Cash Box',
    account_type: 'cash',
    currency: 'USD',
    institution_name: null,
    initial_balance: 200,
    current_balance: 300,
    icon: null,
    color: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
  };

  const balanceA: AccountMonthlyBalance[] = [
    {
      id: 'b-1',
      account_id: walletA.id,
      year: 2026,
      month: 5,
      opening_balance: 1000,
      total_debits: 0,
      total_credits: 500,
      closing_balance: 1500,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    },
    {
      id: 'b-2',
      account_id: walletA.id,
      year: 2026,
      month: 6,
      opening_balance: 1500,
      total_debits: 200,
      total_credits: 0,
      closing_balance: 1300,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    },
  ];

  const balanceB: AccountMonthlyBalance[] = [
    {
      id: 'b-3',
      account_id: walletB.id,
      year: 2026,
      month: 5,
      opening_balance: 200,
      total_debits: 0,
      total_credits: 100,
      closing_balance: 300,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    },
    {
      id: 'b-4',
      account_id: walletB.id,
      year: 2026,
      month: 6,
      opening_balance: 300,
      total_debits: 50,
      total_credits: 0,
      closing_balance: 250,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    activeCondominium = signal<CondominiumWithRole | null>(mockCondominium);
    networkStatus = signal(true);

    accountsServiceSpy = jasmine.createSpyObj('CondominiumAccounts', ['fetchByCondominium'], {
      accounts$: new BehaviorSubject<CondominiumAccount[]>([]),
    });
    accountsServiceSpy.fetchByCondominium.and.returnValue(Promise.resolve([]));

    balanceServiceSpy = jasmine.createSpyObj('AccountBalanceService', ['fetchMonthlyByAccount']);
    balanceServiceSpy.fetchMonthlyByAccount.and.returnValue(Promise.resolve([]));

    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
      providers: [
        { provide: CondominiumAccounts, useValue: accountsServiceSpy },
        { provide: AccountBalanceService, useValue: balanceServiceSpy },
        {
          provide: ContextService,
          useValue: {
            activeCondominium: activeCondominium,
          } as unknown as ContextService,
        },
        { provide: NetworkStatusService, useValue: { isOnline: networkStatus } },
      ],
    });

    service = TestBed.inject(FinancialDashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadData', () => {
    it('should fetch accounts for the active condominium', async () => {
      accountsServiceSpy.fetchByCondominium.and.returnValue(Promise.resolve([walletA]));

      await service.loadData();

      expect(accountsServiceSpy.fetchByCondominium).toHaveBeenCalledWith(condominiumId);
      expect(await firstValueFrom(service.loading$)).toBe(false);
      expect(await firstValueFrom(service.error$)).toBeNull();
    });

    it('should set error when there is no active condominium', async () => {
      activeCondominium.set(null);

      await service.loadData();

      expect(accountsServiceSpy.fetchByCondominium).not.toHaveBeenCalled();
      expect(await firstValueFrom(service.error$)).toEqual(jasmine.any(Error));
    });

    it('should set error when fetch fails', async () => {
      const error = new Error('Fetch failed');
      accountsServiceSpy.fetchByCondominium.and.returnValue(Promise.reject(error));

      await service.loadData();

      expect(await firstValueFrom(service.error$)).toBe(error);
      expect(await firstValueFrom(service.loading$)).toBe(false);
    });
  });

  describe('netWorth$', () => {
    it('should sum all wallet current balances', async () => {
      accountsServiceSpy.accounts$.next([walletA, walletB]);

      const netWorth = await firstValueFrom(service.netWorth$);

      expect(netWorth).toBe(1800);
    });

    it('should emit 0 when there are no wallets', async () => {
      accountsServiceSpy.accounts$.next([]);

      const netWorth = await firstValueFrom(service.netWorth$);

      expect(netWorth).toBe(0);
    });
  });

  describe('isEmpty$', () => {
    it('should emit true when wallets are empty', async () => {
      accountsServiceSpy.accounts$.next([]);

      expect(await firstValueFrom(service.isEmpty$)).toBe(true);
    });

    it('should emit false when wallets exist', async () => {
      accountsServiceSpy.accounts$.next([walletA]);

      expect(await firstValueFrom(service.isEmpty$)).toBe(false);
    });
  });

  describe('netWorthHistory$', () => {
    it('should aggregate monthly balances across all wallets', async () => {
      accountsServiceSpy.accounts$.next([walletA, walletB]);
      balanceServiceSpy.fetchMonthlyByAccount.withArgs(walletA.id).and.returnValue(Promise.resolve(balanceA));
      balanceServiceSpy.fetchMonthlyByAccount.withArgs(walletB.id).and.returnValue(Promise.resolve(balanceB));

      const history = await firstValueFrom(service.netWorthHistory$);

      expect(history.length).toBe(2);
      expect(history[0]).toEqual(
        jasmine.objectContaining({
          date: '2026-05-01',
          value: 1800,
        }),
      );
      expect(history[1]).toEqual(
        jasmine.objectContaining({
          date: '2026-06-01',
          value: 1550,
        }),
      );
    });

    it('should return empty array when no wallets exist', async () => {
      accountsServiceSpy.accounts$.next([]);

      const history = await firstValueFrom(service.netWorthHistory$);

      expect(history).toEqual([]);
      expect(balanceServiceSpy.fetchMonthlyByAccount).not.toHaveBeenCalled();
    });

    it('should filter history by selected duration', async () => {
      service.setDuration('1m');
      accountsServiceSpy.accounts$.next([walletA]);

      const currentDate = new Date();
      const oldBalance: AccountMonthlyBalance = {
        id: 'b-old',
        account_id: walletA.id,
        year: currentDate.getFullYear() - 1,
        month: 1,
        opening_balance: 0,
        total_debits: 0,
        total_credits: 100,
        closing_balance: 100,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      const recentBalance: AccountMonthlyBalance = {
        id: 'b-recent',
        account_id: walletA.id,
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        opening_balance: 100,
        total_debits: 0,
        total_credits: 100,
        closing_balance: 200,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      balanceServiceSpy.fetchMonthlyByAccount.and.returnValue(Promise.resolve([oldBalance, recentBalance]));

      const history = await firstValueFrom(service.netWorthHistory$);

      expect(history.length).toBe(1);
      expect(history[0].date).toBe(
        `${recentBalance.year}-${String(recentBalance.month).padStart(2, '0')}-01`,
      );
    });

    it('should set error when offline and no cached history data exists', async () => {
      networkStatus.set(false);
      accountsServiceSpy.accounts$.next([walletA]);
      balanceServiceSpy.fetchMonthlyByAccount.and.returnValue(Promise.resolve([]));

      await firstValueFrom(service.netWorthHistory$);

      const error = await firstValueFrom(service.error$);
      expect(error).toEqual(jasmine.any(Error));
      expect((error as Error).message).toContain('No cached history data available while offline');
    });
  });

  describe('selectedDuration', () => {
    it('should default to 1m', () => {
      expect(service.selectedDuration()).toBe('1m');
    });

    it('should update when setDuration is called', () => {
      service.setDuration('1y');

      expect(service.selectedDuration()).toBe('1y');
    });
  });
});
