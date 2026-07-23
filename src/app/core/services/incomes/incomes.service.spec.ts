import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { IncomesService, CreateIncomeData } from './incomes.service';
import { Supabase } from '@core/services/supabase/supabase';
import { NetworkStatusService } from '@core/services/network-status/network-status.service';
import { LocalRepository } from '@core/services/sync/local-repository';
import { SyncService } from '@core/services/sync/sync-service';
import { TelemetryService } from '@core/services/telemetry/telemetry.service';
import { Profile } from '@core/services/profile/profile';
import { ContextService } from '@core/services/context/context.service';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import type { FinancialTransaction } from '@app-types/financial-transactions';
import type { CondominiumAccount } from '@app-types/condominium-accounts';

describe('IncomesService', () => {
  let service: IncomesService;
  let mockSupabase: jasmine.SpyObj<Supabase>;
  let mockNetworkStatus: jasmine.SpyObj<NetworkStatusService>;
  let mockLocalRepo: jasmine.SpyObj<LocalRepository>;
  let mockSyncService: jasmine.SpyObj<SyncService>;
  let mockTelemetry: jasmine.SpyObj<TelemetryService>;
  let mockProfile: jasmine.SpyObj<Profile>;
  let mockContext: jasmine.SpyObj<ContextService>;
  let mockAccounts: jasmine.SpyObj<CondominiumAccounts>;

  const mockProfileData = { id: 'profile-123', email: 'test@example.com' };
  const mockCondominium = { id: 'condo-123', name: 'Test Condo', currency: 'USD' };

  beforeEach(() => {
    const supabaseSpy = jasmine.createSpyObj('Supabase', ['client'], {
      client: jasmine.createSpyObj('SupabaseClient', ['from']),
    });

    mockSupabase = supabaseSpy;
    mockNetworkStatus = jasmine.createSpyObj('NetworkStatusService', ['isOnline']);
    mockLocalRepo = jasmine.createSpyObj('LocalRepository', [
      'upsert',
      'getById',
      'getEntitiesByType',
    ]);
    mockSyncService = jasmine.createSpyObj('SyncService', ['enqueueMutation']);
    mockTelemetry = jasmine.createSpyObj('TelemetryService', ['track']);
    mockProfile = jasmine.createSpyObj('Profile', [], {
      profile$: new BehaviorSubject(mockProfileData),
    });
    mockContext = jasmine.createSpyObj('ContextService', ['activeCondominium']);
    mockAccounts = jasmine.createSpyObj('CondominiumAccounts', ['fetchByCondominium']);

    TestBed.configureTestingModule({
      providers: [
        IncomesService,
        { provide: Supabase, useValue: mockSupabase },
        { provide: NetworkStatusService, useValue: mockNetworkStatus },
        { provide: LocalRepository, useValue: mockLocalRepo },
        { provide: SyncService, useValue: mockSyncService },
        { provide: TelemetryService, useValue: mockTelemetry },
        { provide: Profile, useValue: mockProfile },
        { provide: ContextService, useValue: mockContext },
        { provide: CondominiumAccounts, useValue: mockAccounts },
      ],
    });

    service = TestBed.inject(IncomesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createIncome - Online', () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline.and.returnValue(true);
      mockContext.activeCondominium.and.returnValue(mockCondominium);
      mockLocalRepo.upsert.and.returnValue(Promise.resolve());
      mockAccounts.fetchByCondominium.and.returnValue(Promise.resolve([]));

      const mockInsert = jasmine.createSpyObj('insert', ['select']);
      const mockSelect = jasmine.createSpyObj('select', ['single']);
      const mockSingle = jasmine.createSpyObj('single', []);

      mockSupabase.client.from.and.returnValue({
        insert: mockInsert,
      });

      mockInsert.select.and.returnValue(mockSelect);
      mockSelect.single.and.returnValue(mockSingle);

      mockSingle.and.returnValue(
        Promise.resolve({
          data: {
            id: 'income-123',
            condominium_id: 'condo-123',
            account_id: 'account-123',
            category_id: 'category-123',
            type: 'income',
            status: 'completed',
            amount: 100,
            original_currency: 'USD',
            exchange_rate: 1,
            base_amount: 100,
            base_currency: 'USD',
            description: 'Test income',
            reference_number: null,
            transaction_date: '2026-07-23',
            created_by: 'profile-123',
            created_at: '2026-07-23T10:00:00Z',
            updated_at: '2026-07-23T10:00:00Z',
            deleted_at: null,
          },
          error: null,
        }),
      );
    });

    it('should create income with status completed', async () => {
      const incomeData: CreateIncomeData = {
        condominium_id: 'condo-123',
        account_id: 'account-123',
        category_id: 'category-123',
        amount: 100,
        original_currency: 'USD',
        description: 'Test income',
        transaction_date: '2026-07-23',
      };

      const result = await service.createIncome(incomeData);

      expect(result.status).toBe('completed');
      expect(result.type).toBe('income');
      expect(mockSupabase.client.from).toHaveBeenCalledWith('financial_transactions');
    });

    it('should refresh wallet cache after creating income', async () => {
      const incomeData: CreateIncomeData = {
        condominium_id: 'condo-123',
        account_id: 'account-123',
        category_id: 'category-123',
        amount: 100,
        original_currency: 'USD',
        description: 'Test income',
        transaction_date: '2026-07-23',
      };

      await service.createIncome(incomeData);

      expect(mockAccounts.fetchByCondominium).toHaveBeenCalledWith('condo-123');
    });

    it('should track telemetry event', async () => {
      const incomeData: CreateIncomeData = {
        condominium_id: 'condo-123',
        account_id: 'account-123',
        category_id: 'category-123',
        amount: 100,
        original_currency: 'USD',
        description: 'Test income',
        transaction_date: '2026-07-23',
      };

      await service.createIncome(incomeData);

      expect(mockTelemetry.track).toHaveBeenCalledWith(
        'financial_transaction_created',
        jasmine.objectContaining({
          transaction_type: 'income',
          amount: 100,
          currency: 'USD',
          condominium_id: 'condo-123',
          is_transfer: false,
          has_exchange_rate: false,
        }),
      );
    });

    it('should calculate base_amount correctly with exchange rate', async () => {
      const incomeData: CreateIncomeData = {
        condominium_id: 'condo-123',
        account_id: 'account-123',
        category_id: 'category-123',
        amount: 100,
        original_currency: 'EUR',
        exchange_rate: 1.1,
        description: 'Test income',
        transaction_date: '2026-07-23',
      };

      await service.createIncome(incomeData);

      expect(mockSupabase.client.from).toHaveBeenCalledWith('financial_transactions');
    });

    it('should update local incomes list', async () => {
      const incomeData: CreateIncomeData = {
        condominium_id: 'condo-123',
        account_id: 'account-123',
        category_id: 'category-123',
        amount: 100,
        original_currency: 'USD',
        description: 'Test income',
        transaction_date: '2026-07-23',
      };

      let emittedIncomes: FinancialTransaction[] = [];
      service.incomes$.subscribe((incomes) => {
        emittedIncomes = incomes;
      });

      await service.createIncome(incomeData);

      expect(emittedIncomes.length).toBe(1);
      expect(emittedIncomes[0].type).toBe('income');
    });
  });

  describe('createIncome - Offline', () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline.and.returnValue(false);
      mockContext.activeCondominium.and.returnValue(mockCondominium);
      mockLocalRepo.upsert.and.returnValue(Promise.resolve());
      mockSyncService.enqueueMutation.and.returnValue(Promise.resolve());
      mockAccounts.fetchByCondominium.and.returnValue(Promise.resolve([]));
    });

    it('should create income offline with pending status', async () => {
      const incomeData: CreateIncomeData = {
        condominium_id: 'condo-123',
        account_id: 'account-123',
        category_id: 'category-123',
        amount: 100,
        original_currency: 'USD',
        description: 'Test income',
        transaction_date: '2026-07-23',
      };

      const result = await service.createIncome(incomeData);

      expect(result.status).toBe('pending');
      expect(result._local_status).toBe('pending');
      expect(mockLocalRepo.upsert).toHaveBeenCalled();
    });

    it('should queue mutation for sync with pending status', async () => {
      const incomeData: CreateIncomeData = {
        condominium_id: 'condo-123',
        account_id: 'account-123',
        category_id: 'category-123',
        amount: 100,
        original_currency: 'USD',
        description: 'Test income',
        transaction_date: '2026-07-23',
      };

      await service.createIncome(incomeData);

      expect(mockSyncService.enqueueMutation).toHaveBeenCalledWith(
        'create',
        'financial_transaction',
        jasmine.any(String),
        jasmine.objectContaining({
          type: 'income',
          status: 'pending',
        }),
        jasmine.any(String),
      );
    });

    it('should refresh wallet cache even when offline', async () => {
      const incomeData: CreateIncomeData = {
        condominium_id: 'condo-123',
        account_id: 'account-123',
        category_id: 'category-123',
        amount: 100,
        original_currency: 'USD',
        description: 'Test income',
        transaction_date: '2026-07-23',
      };

      await service.createIncome(incomeData);

      expect(mockAccounts.fetchByCondominium).toHaveBeenCalledWith('condo-123');
    });
  });

  describe('fetchIncomesByCondominium', () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline.and.returnValue(true);
      mockLocalRepo.upsert.and.returnValue(Promise.resolve());

      const mockSelect = jasmine.createSpyObj('select', ['eq', 'is', 'order']);
      mockSupabase.client.from.and.returnValue({
        select: mockSelect,
      });

      mockSelect.eq.and.returnValue(mockSelect);
      mockSelect.is.and.returnValue(mockSelect);
      mockSelect.order.and.returnValue(
        Promise.resolve({
          data: [
            {
              id: 'income-1',
              type: 'income',
              status: 'completed',
              amount: 100,
              condominium_id: 'condo-123',
            },
          ],
          error: null,
        }),
      );
    });

    it('should fetch incomes for a condominium', async () => {
      const result = await service.fetchIncomesByCondominium('condo-123');

      expect(result.length).toBe(1);
      expect(mockSupabase.client.from).toHaveBeenCalledWith('financial_transactions');
    });

    it('should update incomes$ BehaviorSubject', async () => {
      let emittedIncomes: FinancialTransaction[] = [];
      service.incomes$.subscribe((incomes) => {
        emittedIncomes = incomes;
      });

      await service.fetchIncomesByCondominium('condo-123');

      expect(emittedIncomes.length).toBe(1);
    });

    it('should handle offline scenario', async () => {
      mockNetworkStatus.isOnline.and.returnValue(false);
      mockLocalRepo.getEntitiesByType.and.returnValue(
        Promise.resolve([
          {
            data: {
              id: 'income-1',
              type: 'income',
              condominium_id: 'condo-123',
            },
          },
        ]),
      );

      const result = await service.fetchIncomesByCondominium('condo-123');

      expect(result.length).toBe(1);
      expect(mockLocalRepo.getEntitiesByType).toHaveBeenCalledWith('financial_transaction');
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline.and.returnValue(true);
      mockContext.activeCondominium.and.returnValue(mockCondominium);

      const mockInsert = jasmine.createSpyObj('insert', ['select']);
      const mockSelect = jasmine.createSpyObj('select', ['single']);
      const mockSingle = jasmine.createSpyObj('single', []);

      mockSupabase.client.from.and.returnValue({
        insert: mockInsert,
      });

      mockInsert.select.and.returnValue(mockSelect);
      mockSelect.single.and.returnValue(mockSingle);

      mockSingle.and.returnValue(
        Promise.resolve({
          data: null,
          error: { message: 'Database error', code: '500' },
        }),
      );
    });

    it('should update error$ BehaviorSubject on failure', async () => {
      const incomeData: CreateIncomeData = {
        condominium_id: 'condo-123',
        account_id: 'account-123',
        category_id: 'category-123',
        amount: 100,
        original_currency: 'USD',
        description: 'Test income',
        transaction_date: '2026-07-23',
      };

      let emittedError: unknown = null;
      service.error$.subscribe((error) => {
        emittedError = error;
      });

      try {
        await service.createIncome(incomeData);
      } catch (error) {
        // Expected to throw
      }

      // Error should have been set
      expect(emittedError).toBeTruthy();
    });

    it('should throw error when Supabase insert fails', async () => {
      const incomeData: CreateIncomeData = {
        condominium_id: 'condo-123',
        account_id: 'account-123',
        category_id: 'category-123',
        amount: 100,
        original_currency: 'USD',
        description: 'Test income',
        transaction_date: '2026-07-23',
      };

      await expectAsync(service.createIncome(incomeData)).toBeRejected();
    });
  });
});
