import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { TransactionCategories } from './transaction-categories';
import { Supabase } from '@core/services/supabase/supabase';
import { NetworkStatusService } from '@core/services/network-status.service';
import { LocalRepository } from '@core/services/sync/local-repository';
import { SyncService } from '@core/services/sync/sync-service';
import { TelemetryService } from '@core/services/telemetry/telemetry.service';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';
import type {
  CategoryTreeNode,
  CreateTransactionCategoryData,
  TransactionCategory,
} from '@app-types/transaction-categories';

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

describe('TransactionCategories', () => {
  let service: TransactionCategories;
  let mockSupabase: MockSupabaseClient;
  let networkStatus: ReturnType<typeof signal<boolean>>;
  let localRepoSpy: jasmine.SpyObj<LocalRepository>;
  let syncServiceSpy: jasmine.SpyObj<SyncService>;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;

  const condominiumId = '00000000-0000-0000-0000-000000000001';

  const rootCategory: TransactionCategory = {
    id: '00000000-0000-0000-0000-000000000002',
    condominium_id: condominiumId,
    parent_id: null,
    name: 'Maintenance',
    category_type: 'expense',
    icon: 'construct',
    color: '#ff8200',
    is_system: true,
    i18n_key: 'maintenance',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    deleted_at: null,
  };

  const childCategory: TransactionCategory = {
    id: '00000000-0000-0000-0000-000000000003',
    condominium_id: condominiumId,
    parent_id: rootCategory.id,
    name: 'Repairs',
    category_type: 'expense',
    icon: 'hammer',
    color: '#ff8200',
    is_system: true,
    i18n_key: 'maintenance_repairs',
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

    service = TestBed.inject(TransactionCategories);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchByType', () => {
    it('should build a tree of root categories with their children', async () => {
      mockSupabase.setSelectResponse([rootCategory, childCategory]);

      const result = await service.fetchByType(condominiumId, 'expense');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(rootCategory.id);
      expect(result[0].children.length).toBe(1);
      expect(result[0].children[0].id).toBe(childCategory.id);
    });
  });

  describe('create', () => {
    it('should reject creating a third-level category online', async () => {
      mockSupabase.setSingleResponse({
        parent_id: rootCategory.id,
        is_system: false,
      });

      const createData: CreateTransactionCategoryData = {
        condominium_id: condominiumId,
        parent_id: childCategory.id,
        name: 'Deep Repair',
        category_type: 'expense',
        icon: 'hammer',
        color: '#ff0000',
      };

      await expectAsync(service.create(createData)).toBeRejectedWithError(
        'Categories can only be nested two levels deep',
      );
    });

    it('should reject creating a third-level category offline', async () => {
      networkStatus.set(false);
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(childCategory as unknown as Record<string, unknown>),
      );

      const createData: CreateTransactionCategoryData = {
        condominium_id: condominiumId,
        parent_id: childCategory.id,
        name: 'Deep Repair',
        category_type: 'expense',
        icon: 'hammer',
        color: '#ff0000',
      };

      await expectAsync(service.create(createData)).toBeRejectedWithError(
        'Categories can only be nested two levels deep',
      );
    });

    it('should queue a mutation when creating offline', async () => {
      networkStatus.set(false);
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(rootCategory as unknown as Record<string, unknown>),
      );
      localRepoSpy.upsert.and.returnValue(Promise.resolve());
      syncServiceSpy.enqueueMutation.and.returnValue(Promise.resolve());

      const createData: CreateTransactionCategoryData = {
        condominium_id: condominiumId,
        parent_id: rootCategory.id,
        name: 'Custom Maintenance',
        category_type: 'expense',
        icon: 'brush',
        color: '#00aa00',
      };

      const result = await service.create(createData);

      expect(result.name).toBe('Custom Maintenance');
      expect(result.parent_id).toBe(rootCategory.id);
      expect(result.is_system).toBe(false);
      expect((result as TransactionCategory & { _local_status: string })._local_status).toBe('pending');
      expect(syncServiceSpy.enqueueMutation).toHaveBeenCalledWith(
        'create',
        'transaction_category',
        result.id,
        jasmine.objectContaining({
          name: 'Custom Maintenance',
          parent_id: rootCategory.id,
          category_type: 'expense',
        }),
        jasmine.stringMatching(/^create-transaction_category-/),
      );
    });

    it('should track telemetry when creating online', async () => {
      const createdCategory: TransactionCategory = {
        id: '00000000-0000-0000-0000-000000000004',
        condominium_id: condominiumId,
        parent_id: null,
        name: 'Custom Income',
        category_type: 'income',
        icon: 'cash',
        color: '#00aa00',
        is_system: false,
        i18n_key: null,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
        deleted_at: null,
      };
      mockSupabase.setSingleResponse(createdCategory);

      const createData: CreateTransactionCategoryData = {
        condominium_id: condominiumId,
        parent_id: null,
        name: 'Custom Income',
        category_type: 'income',
        icon: 'cash',
        color: '#00aa00',
      };

      await service.create(createData);

      expect(telemetrySpy.track).toHaveBeenCalledWith(
        TelemetryEvents.FINANCIAL_CATEGORY_CREATED,
        jasmine.objectContaining({
          category_id: createdCategory.id,
          condominium_id: condominiumId,
          category_type: 'income',
          parent_id: null,
        }),
      );
    });

    it('should track telemetry when creating offline', async () => {
      networkStatus.set(false);
      localRepoSpy.upsert.and.returnValue(Promise.resolve());
      syncServiceSpy.enqueueMutation.and.returnValue(Promise.resolve());

      const createData: CreateTransactionCategoryData = {
        condominium_id: condominiumId,
        parent_id: null,
        name: 'Offline Category',
        category_type: 'expense',
        icon: 'cash',
        color: '#00aa00',
      };

      const result = await service.create(createData);

      expect(telemetrySpy.track).toHaveBeenCalledWith(
        TelemetryEvents.FINANCIAL_CATEGORY_CREATED,
        jasmine.objectContaining({
          category_id: result.id,
          condominium_id: condominiumId,
          category_type: 'expense',
          parent_id: null,
        }),
      );
    });
  });

  describe('update', () => {
    it('should reject updating a system category', async () => {
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(rootCategory as unknown as Record<string, unknown>),
      );

      await expectAsync(
        service.update(rootCategory.id, { name: 'Hacked' }),
      ).toBeRejectedWithError('System categories cannot be updated');
    });
  });

  describe('delete', () => {
    it('should reject deleting a system category', async () => {
      localRepoSpy.getById.and.returnValue(
        Promise.resolve(rootCategory as unknown as Record<string, unknown>),
      );

      await expectAsync(service.delete(rootCategory.id)).toBeRejectedWithError(
        'System categories cannot be deleted',
      );
    });
  });
});
