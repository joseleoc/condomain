import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, Signal } from '@angular/core';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { CondominiumQueryService } from './condominium-query.service';
import { NetworkStatusService } from './network-status.service';
import { Condominium } from './condominium/condominium';
import { LocalRepository } from './sync/local-repository';
import type { CondominiumWithRole } from '@app-types/condominium';
import type { LocalDBSchema } from './sync/local-db';

describe('CondominiumQueryService', () => {
  let service: CondominiumQueryService;
  let isOnlineSignal: Signal<boolean>;
  let condominiumService: jasmine.SpyObj<Condominium>;
  let localRepository: jasmine.SpyObj<LocalRepository>;
  let queryClient: QueryClient;

  const mockCondominiums: CondominiumWithRole[] = [
    {
      id: 'condo-1',
      name: 'Test Condo 1',
      currency: 'USD',
      owner_id: 'user-1',
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
      role_id: 'role-admin',
    },
    {
      id: 'condo-2',
      name: 'Test Condo 2',
      currency: 'VES',
      owner_id: 'user-1',
      active: true,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      deleted_at: null,
      role_id: 'role-owner',
    },
  ];

  function makeEntityWrapper(condo: CondominiumWithRole): LocalDBSchema['entities']['value'] {
    return {
      key: `condominiums:${condo.id}`,
      entity_type: 'condominiums',
      entity_id: condo.id,
      data: condo as unknown as Record<string, unknown>,
      version: 1,
      _local_status: 'synced',
      updated_at: condo.updated_at,
    };
  }

  beforeEach(() => {
    isOnlineSignal = signal(true);

    const condoSpy = jasmine.createSpyObj<Condominium>('Condominium', ['fetchUserCondominiums']);
    condoSpy.userCondominiums$ = {
      getValue: () => mockCondominiums,
    } as any;

    const repoSpy = jasmine.createSpyObj<LocalRepository>('LocalRepository', [
      'getEntitiesByType',
      'upsert',
    ]);
    repoSpy.getEntitiesByType.and.resolveTo(mockCondominiums.map(makeEntityWrapper));

    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
      providers: [
        provideTanStackQuery(new QueryClient()),
        CondominiumQueryService,
        {
          provide: NetworkStatusService,
          useValue: { isOnline: isOnlineSignal },
        },
        { provide: Condominium, useValue: condoSpy },
        { provide: LocalRepository, useValue: repoSpy },
      ],
    });

    service = TestBed.inject(CondominiumQueryService);
    condominiumService = TestBed.inject(Condominium) as jasmine.SpyObj<Condominium>;
    localRepository = TestBed.inject(LocalRepository) as jasmine.SpyObj<LocalRepository>;
    queryClient = TestBed.inject(QueryClient);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('getCondominiums', () => {
    it('should create a query function', () => {
      const query = service.getCondominiums('user-1');
      expect(query).toBeDefined();
      expect(query.queryKey).toEqual(['condominiums', 'user-1']);
    });

    it('should fetch from Supabase when online', fakeAsync(() => {
      condominiumService.fetchUserCondominiums.and.resolveTo(undefined);

      const query = service.getCondominiums('user-1');
      query.queryFn();
      tick();

      expect(condominiumService.fetchUserCondominiums).toHaveBeenCalledWith({
        profileId: 'user-1',
      });
    }));

    it('should read from local DB when offline', fakeAsync(async () => {
      isOnlineSignal = signal(false);
      TestBed.resetTestingModule();

      const condoSpy = jasmine.createSpyObj<Condominium>('Condominium', ['fetchUserCondominiums']);
      condoSpy.userCondominiums$ = { getValue: () => mockCondominiums } as any;

      const repoSpy = jasmine.createSpyObj<LocalRepository>('LocalRepository', [
        'getEntitiesByType',
        'upsert',
      ]);
      repoSpy.getEntitiesByType.and.resolveTo(mockCondominiums.map(makeEntityWrapper));

      TestBed.configureTestingModule({
        imports: [SharedTestingModule],
        providers: [
          provideTanStackQuery(new QueryClient()),
          CondominiumQueryService,
          { provide: NetworkStatusService, useValue: { isOnline: signal(false) } },
          { provide: Condominium, useValue: condoSpy },
          { provide: LocalRepository, useValue: repoSpy },
        ],
      });

      const offlineService = TestBed.inject(CondominiumQueryService);
      const query = offlineService.getCondominiums('user-1');
      const result = await query.queryFn();

      expect(repoSpy.getEntitiesByType).toHaveBeenCalledWith('condominiums');
      expect(result).toEqual(mockCondominiums);
    }));

    it('should return empty array when offline and local DB has no data', fakeAsync(async () => {
      TestBed.resetTestingModule();

      const condoSpy = jasmine.createSpyObj<Condominium>('Condominium', ['fetchUserCondominiums']);
      condoSpy.userCondominiums$ = { getValue: () => [] } as any;

      const repoSpy = jasmine.createSpyObj<LocalRepository>('LocalRepository', [
        'getEntitiesByType',
        'upsert',
      ]);
      repoSpy.getEntitiesByType.and.resolveTo([]);

      TestBed.configureTestingModule({
        imports: [SharedTestingModule],
        providers: [
          provideTanStackQuery(new QueryClient()),
          CondominiumQueryService,
          { provide: NetworkStatusService, useValue: { isOnline: signal(false) } },
          { provide: Condominium, useValue: condoSpy },
          { provide: LocalRepository, useValue: repoSpy },
        ],
      });

      const offlineService = TestBed.inject(CondominiumQueryService);
      const query = offlineService.getCondominiums('user-1');
      const result = await query.queryFn();

      expect(result).toEqual([]);
    }));

    it('should throw when online fetch fails', fakeAsync(async () => {
      condominiumService.fetchUserCondominiums.and.rejectWith(
        new Error('Network error'),
      );

      const query = service.getCondominiums('user-1');

      await expectAsync(query.queryFn()).toBeRejectedWithError('Network error');
    }));
  });
});
