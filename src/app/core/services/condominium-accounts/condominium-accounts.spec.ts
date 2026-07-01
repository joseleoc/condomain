import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { CondominiumAccounts } from './condominium-accounts';
import { Supabase } from '@core/services/supabase/supabase';
import { NetworkStatusService } from '@core/services/network-status.service';
import { LocalRepository } from '@core/services/sync/local-repository';
import { SyncService } from '@core/services/sync/sync-service';
import { TelemetryService } from '@core/services/telemetry/telemetry.service';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';
import type {
  CondominiumAccount,
  CreateCondominiumAccountData,
} from '@app-types/condominium-accounts';

interface MockSupabaseClient {
  client: {
    from: jasmine.Spy;
    rpc: jasmine.Spy;
  };
  rpc: jasmine.Spy;
  setSelectResponse: (data: unknown, error?: unknown) => void;
  setSingleResponse: (data: unknown, error?: unknown) => void;
  setUpdateResponse: (data: unknown, error?: unknown) => void;
}

/**
 * Builds a mock Supabase client that supports the query chains used by the service.
 */
function createMockSupabaseClient(): MockSupabaseClient {
  const rpc = jasmine
    .createSpy('rpc')
    .and.returnValue(Promise.resolve({ data: null, error: null }));

  let selectResponse: Promise<{ data: unknown; error: unknown }> = Promise.resolve({ data: null, error: null });
  let singleResponse: Promise<{ data: unknown; error: unknown }> = Promise.resolve({ data: null, error: null });
  let updateResponse: Promise<{ data: unknown; error: unknown }> = Promise.resolve({ data: null, error: null });

  const from = jasmine.createSpy('from').and.callFake(() => createSelectBuilder());

  function createSelectBuilder(): Record<string, unknown> {
    const builder: Record<string, unknown> = {};
    builder['select'] = jasmine.createSpy('select').and.returnValue(builder);
    builder['eq'] = jasmine.createSpy('eq').and.returnValue(builder);
    builder['is'] = jasmine.createSpy('is').and.returnValue(builder);
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
      single: jasmine.createSpy('single').and.returnValue(singleResponse),
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
    setUpdateResponse(data: unknown, error: unknown = null) {
      updateResponse = Promise.resolve({ data, error });
    },
  };
}

describe('CondominiumAccounts', () => {
  let service: CondominiumAccounts;
  let mockSupabase: MockSupabaseClient;
  let networkStatus: ReturnType<typeof signal<boolean>>;
  let localRepoSpy: jasmine.SpyObj<LocalRepository>;
  let syncServiceSpy: jasmine.SpyObj<SyncService>;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;

  const condominiumId = '00000000-0000-0000-0000-000000000001';

  const mockAccount: CondominiumAccount = {
    id: '00000000-0000-0000-0000-000000000002',
    condominium_id: condominiumId,
    name: 'Primary Bank',
    account_type: 'bank',
    currency: 'USD',
    institution_name: 'Example Bank',
    initial_balance: 1000,
    current_balance: 1000,
    icon: 'card',
    color: '#ff8200',
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

    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
      providers: [
        { provide: Supabase, useValue: mockSupabase },
        { provide: NetworkStatusService, useValue: { isOnline: networkStatus } },
        { provide: LocalRepository, useValue: localRepoSpy },
        { provide: SyncService, useValue: syncServiceSpy },
        { provide: TelemetryService, useValue: telemetrySpy },
      ],
    });

    service = TestBed.inject(CondominiumAccounts);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchByCondominium', () => {
    it('should fetch from Supabase and cache locally when online', async () => {
      mockSupabase.setSelectResponse([mockAccount]);

      const result = await service.fetchByCondominium(condominiumId);

      expect(mockSupabase.client.from).toHaveBeenCalledWith('condominium_accounts');
      expect(localRepoSpy.upsert).toHaveBeenCalledWith(
        'account',
        mockAccount as unknown as Record<string, unknown>,
      );
      expect(result).toEqual([mockAccount]);
      expect(service.accounts$.getValue()).toEqual([mockAccount]);
    });

    it('should read from local cache when offline', async () => {
      networkStatus.set(false);
      localRepoSpy.getEntitiesByType.and.returnValue(
        Promise.resolve([
          {
            data: mockAccount as unknown as Record<string, unknown>,
          } as never,
        ]),
      );

      const result = await service.fetchByCondominium(condominiumId);

      expect(mockSupabase.client.from).not.toHaveBeenCalled();
      expect(localRepoSpy.getEntitiesByType).toHaveBeenCalledWith('account');
      expect(result).toEqual([mockAccount]);
    });
  });

  describe('create', () => {
    it('should queue a mutation when creating offline', async () => {
      networkStatus.set(false);
      localRepoSpy.upsert.and.returnValue(Promise.resolve());
      syncServiceSpy.enqueueMutation.and.returnValue(Promise.resolve());

      const createData: CreateCondominiumAccountData = {
        condominium_id: condominiumId,
        name: 'Petty Cash',
        account_type: 'cash',
        currency: 'USD',
        institution_name: null,
        initial_balance: 50,
        icon: 'cash',
        color: '#00aa00',
      };

      const result = await service.create(createData);

      expect(result.name).toBe('Petty Cash');
      expect(result.condominium_id).toBe(condominiumId);
      expect((result as CondominiumAccount & { _local_status: string })._local_status).toBe('pending');
      expect(localRepoSpy.upsert).toHaveBeenCalled();
      expect(syncServiceSpy.enqueueMutation).toHaveBeenCalledWith(
        'create',
        'account',
        result.id,
        jasmine.objectContaining({
          name: 'Petty Cash',
          condominium_id: condominiumId,
          account_type: 'cash',
        }),
        jasmine.stringMatching(/^create-account-/),
      );
    });

    it('should track telemetry when creating online', async () => {
      mockSupabase.setSingleResponse(mockAccount);

      const createData: CreateCondominiumAccountData = {
        condominium_id: condominiumId,
        name: 'Primary Bank',
        account_type: 'bank',
        currency: 'USD',
        institution_name: 'Example Bank',
        initial_balance: 1000,
        icon: 'card',
        color: '#ff8200',
      };

      await service.create(createData);

      expect(telemetrySpy.track).toHaveBeenCalledWith(
        TelemetryEvents.FINANCIAL_WALLET_CREATED,
        jasmine.objectContaining({
          account_id: mockAccount.id,
          condominium_id: condominiumId,
          account_type: 'bank',
        }),
      );
    });

    it('should track telemetry when creating offline', async () => {
      networkStatus.set(false);
      localRepoSpy.upsert.and.returnValue(Promise.resolve());
      syncServiceSpy.enqueueMutation.and.returnValue(Promise.resolve());

      const createData: CreateCondominiumAccountData = {
        condominium_id: condominiumId,
        name: 'Offline Wallet',
        account_type: 'cash',
        currency: 'USD',
        institution_name: null,
        initial_balance: 25,
        icon: 'cash',
        color: '#00aa00',
      };

      const result = await service.create(createData);

      expect(telemetrySpy.track).toHaveBeenCalledWith(
        TelemetryEvents.FINANCIAL_WALLET_CREATED,
        jasmine.objectContaining({
          account_id: result.id,
          condominium_id: condominiumId,
          account_type: 'cash',
        }),
      );
    });
  });

  describe('update', () => {
    it('should revert optimistic local update on Supabase error', async () => {
      const existing = { ...mockAccount };
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(existing as unknown as Record<string, unknown>),
      );
      localRepoSpy.upsert.and.returnValue(Promise.resolve());
      mockSupabase.setUpdateResponse(null, new Error('Update failed'));

      await expectAsync(
        service.update(mockAccount.id, { name: 'Updated Name' }),
      ).toBeRejectedWithError('Update failed');

      const lastCall = localRepoSpy.upsert.calls.mostRecent();
      expect(lastCall.args).toEqual([
        'account',
        existing as unknown as Record<string, unknown>,
      ]);
    });
  });

  describe('delete', () => {
    it('should call soft_delete_account RPC when deleting online', async () => {
      const existing = { ...mockAccount };
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(existing as unknown as Record<string, unknown>),
      );
      localRepoSpy.upsert.and.returnValue(Promise.resolve());

      await service.delete(mockAccount.id);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('soft_delete_account', {
        p_id: mockAccount.id,
        p_reversal_reason: 'Deleted by user',
      });
    });
  });
});
