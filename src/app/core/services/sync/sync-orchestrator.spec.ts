import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { SyncOrchestrator } from './sync-orchestrator';
import { LocalRepository } from './local-repository';
import { ConflictResolver } from './conflict-resolver';
import { Supabase } from '../supabase/supabase';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { resetLocalDB, setTestDbName } from './local-db';

describe('SyncOrchestrator', () => {
  let orchestrator: SyncOrchestrator;
  let localRepo: LocalRepository;
  let conflictResolver: ConflictResolver;
  let supabase: Supabase;
  let queryClient: QueryClient;
  let testDbName: string;

  beforeEach(() => {
    testDbName = `condomain-local-orch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTestDbName(testDbName);
    resetLocalDB();

    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
      providers: [
        SyncOrchestrator,
        LocalRepository,
        ConflictResolver,
        Supabase,
        QueryClient,
      ],
    });

    orchestrator = TestBed.inject(SyncOrchestrator);
    localRepo = TestBed.inject(LocalRepository);
    conflictResolver = TestBed.inject(ConflictResolver);
    supabase = TestBed.inject(Supabase);
    queryClient = TestBed.inject(QueryClient);
  });

  afterEach(() => {
    resetLocalDB();
    setTestDbName('condomain-local');
    try {
      indexedDB.deleteDatabase(testDbName);
    } catch {
      // ignore
    }
  });

  /**
   * Helper to create a valid rpc spy return value.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mockRpc(data: any, error: unknown = null): any {
    return Promise.resolve({ data, error });
  }

  describe('sync()', () => {
    it('should fetch delta using last_sync_at timestamp', async () => {
      const since = '2026-06-20T10:00:00Z';
      await localRepo.setLastSyncAt('expenditures:abc-123', since);

      const rpcSpy = spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc([]),
      );

      await orchestrator.sync('expenditures', 'abc-123');

      expect(rpcSpy).toHaveBeenCalledWith('get_expenditures_delta', {
        p_condominium_id: 'abc-123',
        p_since: since,
      });
    });

    it('should use epoch default when no previous sync exists', async () => {
      const rpcSpy = spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc([]),
      );

      await orchestrator.sync('expenditures', 'abc-123');

      expect(rpcSpy).toHaveBeenCalledWith('get_expenditures_delta', {
        p_condominium_id: 'abc-123',
        p_since: '1970-01-01T00:00:00Z',
      });
    });

    it('should insert new server rows into local DB', async () => {
      const serverRows = [
        {
          id: 'exp-new-1',
          condominium_id: 'abc-123',
          amount: 100,
          version: 1,
          updated_at: '2026-06-21T10:00:00Z',
          operation: 'INSERT',
        },
      ];

      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(serverRows),
      );

      const upsertSpy = spyOn(localRepo, 'upsert').and.callThrough();

      const result = await orchestrator.sync('expenditures', 'abc-123');

      expect(upsertSpy).toHaveBeenCalledWith(
        'expenditures',
        jasmine.objectContaining({
          id: 'exp-new-1',
          _local_status: 'synced',
        }),
      );
      expect(result.synced).toBe(1);
    });

    it('should update existing local rows from server delta', async () => {
      const serverRows = [
        {
          id: 'exp-existing-1',
          condominium_id: 'abc-123',
          amount: 200,
          version: 3,
          updated_at: '2026-06-21T10:00:00Z',
          operation: 'UPDATE',
        },
      ];

      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(serverRows),
      );
      spyOn(localRepo, 'getById').and.returnValue(
        Promise.resolve({
          id: 'exp-existing-1',
          version: 2,
          amount: 150,
        }),
      );

      const upsertSpy = spyOn(localRepo, 'upsert').and.callThrough();

      const result = await orchestrator.sync('expenditures', 'abc-123');

      expect(upsertSpy).toHaveBeenCalledWith(
        'expenditures',
        jasmine.objectContaining({
          id: 'exp-existing-1',
          amount: 200,
          _local_status: 'synced',
        }),
      );
      expect(result.synced).toBe(1);
    });

    it('should detect and resolve conflicts on version mismatch', async () => {
      const serverRows = [
        {
          id: 'exp-conflict-1',
          condominium_id: 'abc-123',
          amount: 300,
          version: 5,
          updated_at: '2026-06-21T10:00:00Z',
          operation: 'UPDATE',
        },
      ];

      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(serverRows),
      );
      spyOn(localRepo, 'getById').and.returnValue(
        Promise.resolve({
          id: 'exp-conflict-1',
          version: 3,
          amount: 100,
        }),
      );

      const resolveSpy = spyOn(conflictResolver, 'resolve').and.callThrough();

      const result = await orchestrator.sync('expenditures', 'abc-123');

      expect(resolveSpy).toHaveBeenCalled();
      expect(result.conflicts).toBe(1);
    });

    it('should update sync timestamp after successful sync', async () => {
      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc([]),
      );

      const setLastSyncSpy = spyOn(localRepo, 'setLastSyncAt');

      await orchestrator.sync('expenditures', 'abc-123');

      expect(setLastSyncSpy).toHaveBeenCalledWith(
        'expenditures:abc-123',
        jasmine.any(String),
      );
    });

    it('should invalidate TanStack Query cache after sync', async () => {
      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc([]),
      );

      const invalidateSpy = spyOn(queryClient, 'invalidateQueries');

      await orchestrator.sync('expenditures', 'abc-123');

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['expenditures', 'abc-123'],
      });
    });

    it('should return correct synced and conflict counts', async () => {
      const serverRows = [
        { id: 'row-1', version: 1, operation: 'INSERT' },
        { id: 'row-2', version: 3, operation: 'UPDATE' },
        { id: 'row-3', version: 1, operation: 'INSERT' },
      ];

      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(serverRows),
      );
      spyOn(localRepo, 'getById').and.callFake(async (_entityType: string, id: string) => {
        if (id === 'row-2') {
          return { id: 'row-2', version: 2 };
        }
        return undefined;
      });

      const result = await orchestrator.sync('expenditures', 'abc-123');

      expect(result.synced).toBe(3);
      expect(result.conflicts).toBe(1);
    });

    it('should handle empty delta gracefully', async () => {
      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc([]),
      );

      const result = await orchestrator.sync('expenditures', 'abc-123');

      expect(result.synced).toBe(0);
      expect(result.conflicts).toBe(0);
    });

    it('should throw an error when RPC call fails', async () => {
      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(null, { message: 'RPC not found', code: '42883' }),
      );

      await expectAsync(
        orchestrator.sync('expenditures', 'abc-123'),
      ).toBeRejectedWithError('Sync failed: RPC not found');
    });
  });
});
