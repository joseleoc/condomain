import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { FinancialTransactions } from './financial-transactions';
import { Supabase } from '@core/services/supabase/supabase';
import { NetworkStatusService } from '@core/services/network-status.service';
import { LocalRepository } from '@core/services/sync/local-repository';
import { SyncService } from '@core/services/sync/sync-service';
import { TelemetryService } from '@core/services/telemetry/telemetry.service';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';
import { Profile } from '@core/services/profile/profile';
import type {
  CreateFinancialTransactionData,
  CreateTransferData,
  FinancialTransaction,
} from '@app-types/financial-transactions';

interface MockSupabaseClient {
  client: {
    from: jasmine.Spy;
    rpc: jasmine.Spy;
  };
  rpc: jasmine.Spy;
  setSelectResponse: (data: unknown, error?: unknown) => void;
  setSingleResponse: (data: unknown, error?: unknown) => void;
  setSingleResponseQueue: (queue: { data: unknown; error?: unknown }[]) => void;
  setUpdateResponse: (data: unknown, error?: unknown) => void;
}

function createMockSupabaseClient(): MockSupabaseClient {
  const rpc = jasmine
    .createSpy('rpc')
    .and.returnValue(Promise.resolve({ data: null, error: null }));

  let selectResponse: Promise<{ data: unknown; error: unknown }> = Promise.resolve({ data: null, error: null });
  let singleResponse: Promise<{ data: unknown; error: unknown }> = Promise.resolve({ data: null, error: null });
  let singleResponseQueue: Promise<{ data: unknown; error: unknown }>[] = [];
  let updateResponse: Promise<{ data: unknown; error: unknown }> = Promise.resolve({ data: null, error: null });

  const from = jasmine.createSpy('from').and.callFake(() => createSelectBuilder());

  function createSelectBuilder(): Record<string, unknown> {
    const builder: Record<string, unknown> = {};
    builder['select'] = jasmine.createSpy('select').and.returnValue(builder);
    builder['eq'] = jasmine.createSpy('eq').and.returnValue(builder);
    builder['is'] = jasmine.createSpy('is').and.returnValue(builder);
    builder['gte'] = jasmine.createSpy('gte').and.returnValue(builder);
    builder['lte'] = jasmine.createSpy('lte').and.returnValue(builder);
    builder['order'] = jasmine.createSpy('order').and.returnValue(selectResponse);
    builder['single'] = jasmine.createSpy('single').and.returnValue(singleResponse);
    builder['insert'] = jasmine.createSpy('insert').and.returnValue(createInsertBuilder());
    builder['update'] = jasmine.createSpy('update').and.returnValue(createUpdateBuilder());
    return builder;
  }

  function createInsertBuilder(): Record<string, unknown> {
    return {
      select: jasmine.createSpy('select').and.returnValue(createSingleBuilder()),
    };
  }

  function createSingleBuilder(): Record<string, unknown> {
    return {
      single: jasmine.createSpy('single').and.callFake(() => {
        if (singleResponseQueue.length > 0) {
          return singleResponseQueue.shift();
        }
        return singleResponse;
      }),
    };
  }

  function createUpdateBuilder(): Record<string, unknown> {
    return {
      eq: jasmine.createSpy('eq').and.returnValue(updateResponse),
    };
  }

  return {
    client: { from, rpc },
    rpc,
    setSelectResponse(data: unknown, error: unknown = null) {
      selectResponse = Promise.resolve({ data, error });
    },
    setSingleResponse(data: unknown, error: unknown = null) {
      singleResponse = Promise.resolve({ data, error });
    },
    setSingleResponseQueue(queue: { data: unknown; error?: unknown }[]) {
      singleResponseQueue = queue.map((item) =>
        Promise.resolve({ data: item.data, error: item.error ?? null }),
      );
    },
    setUpdateResponse(data: unknown, error: unknown = null) {
      updateResponse = Promise.resolve({ data, error });
    },
  };
}

describe('FinancialTransactions', () => {
  let service: FinancialTransactions;
  let mockSupabase: MockSupabaseClient;
  let networkStatus: ReturnType<typeof signal<boolean>>;
  let localRepoSpy: jasmine.SpyObj<LocalRepository>;
  let syncServiceSpy: jasmine.SpyObj<SyncService>;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;
  let profileSpy: jasmine.SpyObj<Profile>;

  const profileId = '00000000-0000-0000-0000-000000000000';
  const condominiumId = '00000000-0000-0000-0000-000000000001';
  const accountId = '00000000-0000-0000-0000-000000000002';
  const categoryId = '00000000-0000-0000-0000-000000000003';

  const mockTransaction: FinancialTransaction = {
    id: '00000000-0000-0000-0000-000000000004',
    condominium_id: condominiumId,
    account_id: accountId,
    category_id: categoryId,
    transfer_group_id: null,
    type: 'expense',
    status: 'pending',
    amount: 100,
    original_currency: 'USD',
    exchange_rate: 1,
    base_amount: 100,
    description: 'Test transaction',
    reference_number: 'REF-001',
    transaction_date: '2026-07-01',
    created_by: profileId,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    deleted_at: null,
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    networkStatus = signal(true);

    localRepoSpy = jasmine.createSpyObj('LocalRepository', [
      'getEntitiesByType',
      'getById',
      'upsert',
    ]);

    syncServiceSpy = jasmine.createSpyObj('SyncService', ['enqueueMutation']);
    telemetrySpy = jasmine.createSpyObj('TelemetryService', ['track']);
    profileSpy = jasmine.createSpyObj('Profile', [], {
      profile$: { getValue: () => ({ id: profileId }) },
    });

    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
      providers: [
        { provide: Supabase, useValue: mockSupabase },
        { provide: NetworkStatusService, useValue: { isOnline: networkStatus } },
        { provide: LocalRepository, useValue: localRepoSpy },
        { provide: SyncService, useValue: syncServiceSpy },
        { provide: TelemetryService, useValue: telemetrySpy },
        { provide: Profile, useValue: profileSpy },
      ],
    });

    service = TestBed.inject(FinancialTransactions);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchByCondominium', () => {
    it('should fetch from Supabase and cache locally when online', async () => {
      mockSupabase.setSelectResponse([mockTransaction]);

      const result = await service.fetchByCondominium(condominiumId);

      expect(mockSupabase.client.from).toHaveBeenCalledWith('financial_transactions');
      expect(localRepoSpy.upsert).toHaveBeenCalledWith(
        'financial_transaction',
        mockTransaction as unknown as Record<string, unknown>,
      );
      expect(result).toEqual([mockTransaction]);
      expect(service.transactions$.getValue()).toEqual([mockTransaction]);
    });

    it('should apply filters when fetching online', async () => {
      mockSupabase.setSelectResponse([mockTransaction]);

      await service.fetchByCondominium(condominiumId, {
        account_id: accountId,
        category_id: categoryId,
        type: 'expense',
        status: 'pending',
        date_from: '2026-07-01',
        date_to: '2026-07-31',
      });

      const builder = mockSupabase.client.from.calls.mostRecent().returnValue;
      expect(builder.eq).toHaveBeenCalledWith('account_id', accountId);
      expect(builder.eq).toHaveBeenCalledWith('category_id', categoryId);
      expect(builder.eq).toHaveBeenCalledWith('type', 'expense');
      expect(builder.eq).toHaveBeenCalledWith('status', 'pending');
      expect(builder.gte).toHaveBeenCalledWith('transaction_date', '2026-07-01');
      expect(builder.lte).toHaveBeenCalledWith('transaction_date', '2026-07-31');
    });

    it('should read from local cache when offline', async () => {
      networkStatus.set(false);
      localRepoSpy.getEntitiesByType.and.returnValue(
        Promise.resolve([
          {
            data: mockTransaction as unknown as Record<string, unknown>,
          } as never,
        ]),
      );

      const result = await service.fetchByCondominium(condominiumId);

      expect(mockSupabase.client.from).not.toHaveBeenCalled();
      expect(localRepoSpy.getEntitiesByType).toHaveBeenCalledWith('financial_transaction');
      expect(result).toEqual([mockTransaction]);
    });
  });

  describe('create', () => {
    it('should insert online and track telemetry', async () => {
      mockSupabase.setSingleResponse(mockTransaction);

      const createData: CreateFinancialTransactionData = {
        condominium_id: condominiumId,
        account_id: accountId,
        category_id: categoryId,
        type: 'expense',
        amount: 100,
        original_currency: 'USD',
        description: 'Test transaction',
        reference_number: 'REF-001',
        transaction_date: '2026-07-01',
      };

      const result = await service.create(createData);

      expect(result.type).toBe('expense');
      expect(result.base_amount).toBe(100);
      expect(localRepoSpy.upsert).toHaveBeenCalled();
      expect(telemetrySpy.track).toHaveBeenCalledWith(
        TelemetryEvents.FINANCIAL_TRANSACTION_CREATED,
        jasmine.objectContaining({
          transaction_type: 'expense',
          amount: 100,
          currency: 'USD',
          condominium_id: condominiumId,
          is_transfer: false,
          has_exchange_rate: false,
        }),
      );
    });

    it('should queue a mutation when creating offline', async () => {
      networkStatus.set(false);
      localRepoSpy.upsert.and.returnValue(Promise.resolve());
      syncServiceSpy.enqueueMutation.and.returnValue(Promise.resolve());

      const createData: CreateFinancialTransactionData = {
        condominium_id: condominiumId,
        account_id: accountId,
        category_id: categoryId,
        type: 'income',
        amount: 250,
        original_currency: 'VES',
        exchange_rate: 55.5,
        description: 'Monthly fee',
        transaction_date: '2026-07-01',
      };

      const result = await service.create(createData);

      expect((result as unknown as { _local_status: string })._local_status).toBe('pending');
      expect(result.type).toBe('income');
      expect(result.base_amount).toBe(13875);
      expect(localRepoSpy.upsert).toHaveBeenCalled();
      expect(syncServiceSpy.enqueueMutation).toHaveBeenCalledWith(
        'create',
        'financial_transaction',
        result.id,
        jasmine.objectContaining({
          type: 'income',
          amount: 250,
          base_amount: 13875,
          created_by: profileId,
        }),
        jasmine.stringMatching(/^create-financial_transaction-/),
      );
    });
  });

  describe('createTransfer', () => {
    it('should create two linked transactions online', async () => {
      const expenseLeg = { ...mockTransaction, id: 'expense-id', type: 'expense' as const };
      const incomeLeg = {
        ...mockTransaction,
        id: 'income-id',
        type: 'income' as const,
        account_id: 'dest-account',
      };

      mockSupabase.setSingleResponseQueue([{ data: expenseLeg }, { data: incomeLeg }]);
      const results = await service.createTransfer({
        condominium_id: condominiumId,
        source_account_id: accountId,
        destination_account_id: 'dest-account',
        amount: 50,
        original_currency: 'USD',
        description: 'Transfer',
        transaction_date: '2026-07-01',
      });

      expect(results.length).toBe(2);
      expect(results[0].type).toBe('expense');
      expect(results[1].type).toBe('income');
      expect(results[0].transfer_group_id).toBe(results[1].transfer_group_id);
    });

    it('should reject same source and destination accounts', async () => {
      await expectAsync(
        service.createTransfer({
          condominium_id: condominiumId,
          source_account_id: accountId,
          destination_account_id: accountId,
          amount: 50,
          original_currency: 'USD',
          description: 'Transfer',
          transaction_date: '2026-07-01',
        }),
      ).toBeRejectedWithError('Source and destination accounts must be different');
    });

    it('should reject non-positive amounts', async () => {
      await expectAsync(
        service.createTransfer({
          condominium_id: condominiumId,
          source_account_id: accountId,
          destination_account_id: 'dest-account',
          amount: 0,
          original_currency: 'USD',
          description: 'Transfer',
          transaction_date: '2026-07-01',
        }),
      ).toBeRejectedWithError('Amount must be greater than zero');
    });
  });

  describe('update', () => {
    it('should reject edits to completed transactions', async () => {
      const existing = { ...mockTransaction, status: 'completed' as const };
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(existing as unknown as Record<string, unknown>),
      );

      await expectAsync(
        service.update(mockTransaction.id, { description: 'Updated' }),
      ).toBeRejectedWithError('Cannot edit completed or voided transactions');
    });

    it('should revert optimistic local update on Supabase error', async () => {
      const existing = { ...mockTransaction };
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(existing as unknown as Record<string, unknown>),
      );
      localRepoSpy.upsert.and.returnValue(Promise.resolve());
      mockSupabase.setUpdateResponse(null, new Error('Update failed'));

      await expectAsync(
        service.update(mockTransaction.id, { description: 'Updated' }),
      ).toBeRejectedWithError('Update failed');

      const lastCall = localRepoSpy.upsert.calls.mostRecent();
      expect(lastCall.args).toEqual([
        'financial_transaction',
        existing as unknown as Record<string, unknown>,
      ]);
    });
  });

  describe('updateStatus', () => {
    it('should allow pending -> completed', async () => {
      const existing = { ...mockTransaction, status: 'pending' as const };
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(existing as unknown as Record<string, unknown>),
      );
      localRepoSpy.upsert.and.returnValue(Promise.resolve());
      mockSupabase.setUpdateResponse({}, null);

      await service.updateStatus(mockTransaction.id, 'completed');

      expect(localRepoSpy.upsert).toHaveBeenCalled();
    });

    it('should reject voided -> pending', async () => {
      const existing = { ...mockTransaction, status: 'voided' as const };
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(existing as unknown as Record<string, unknown>),
      );

      await expectAsync(
        service.updateStatus(mockTransaction.id, 'pending'),
      ).toBeRejectedWithError('Invalid status transition: voided -> pending');
    });
  });

  describe('delete', () => {
    it('should call soft_delete_transaction RPC when deleting online', async () => {
      const existing = { ...mockTransaction };
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(existing as unknown as Record<string, unknown>),
      );
      localRepoSpy.upsert.and.returnValue(Promise.resolve());

      await service.delete(mockTransaction.id);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('soft_delete_transaction', {
        p_id: mockTransaction.id,
        p_reversal_reason: 'Deleted by user',
      });
    });

    it('should queue delete mutation when offline', async () => {
      networkStatus.set(false);
      const existing = { ...mockTransaction };
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(existing as unknown as Record<string, unknown>),
      );
      localRepoSpy.upsert.and.returnValue(Promise.resolve());
      syncServiceSpy.enqueueMutation.and.returnValue(Promise.resolve());

      await service.delete(mockTransaction.id);

      expect(syncServiceSpy.enqueueMutation).toHaveBeenCalledWith(
        'delete',
        'financial_transaction',
        mockTransaction.id,
        { id: mockTransaction.id },
        jasmine.stringMatching(/^delete-financial_transaction-/),
      );
    });
  });
});
