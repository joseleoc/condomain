import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { SyncService, calculateBackoff } from './sync-service';
import { LocalRepository } from './local-repository';
import { NetworkStatusService } from '../network-status.service';
import { Supabase } from '../supabase/supabase';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { resetLocalDB, setTestDbName } from './local-db';

describe('SyncService', () => {
  let service: SyncService;
  let localRepo: LocalRepository;
  let supabase: Supabase;
  let queryClient: QueryClient;
  let testDbName: string;

  /**
   * Helper to create a valid rpc spy return value.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mockRpc(data: any, error: unknown = null): any {
    return Promise.resolve({ data, error });
  }

  beforeEach(() => {
    testDbName = `condomain-local-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTestDbName(testDbName);
    resetLocalDB();

    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
      providers: [
        SyncService,
        LocalRepository,
        NetworkStatusService,
        Supabase,
        QueryClient,
      ],
    });

    service = TestBed.inject(SyncService);
    localRepo = TestBed.inject(LocalRepository);
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

  describe('isOnline()', () => {
    it('should return a boolean', () => {
      const result = service.isOnline();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('enqueueMutation()', () => {
    it('should add a mutation to the outbox via LocalRepository', async () => {
      await service.enqueueMutation(
        'create',
        'expenditure',
        'exp-1',
        { amount: 100, currency: 'USD' },
        'idempotent-key-1',
      );

      const pending = await localRepo.getPendingMutations();
      expect(pending.length).toBe(1);
      expect(pending[0].entity_type).toBe('expenditure');
      expect(pending[0].entity_id).toBe('exp-1');
      expect(pending[0].idempotency_key).toBe('idempotent-key-1');
      expect(pending[0].retry_count).toBe(0);
      expect(pending[0].max_retries).toBe(5);
    });
  });

  describe('processOutbox()', () => {
    it('should do nothing when outbox is empty', async () => {
      const spy = spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(null),
      );

      await service.processOutbox();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should dispatch mutations in FIFO order', async () => {
      const rpcSpy = spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(null),
      );

      await localRepo.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'expenditure',
        entity_id: 'exp-1',
        payload: { amount: 100 },
        idempotency_key: 'key-1',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });
      await localRepo.enqueueMutation({
        mutation_type: 'update',
        entity_type: 'expenditure',
        entity_id: 'exp-2',
        payload: { amount: 200 },
        idempotency_key: 'key-2',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });

      await service.processOutbox();

      expect(rpcSpy.calls.count()).toBe(2);
      expect(rpcSpy.calls.first().args[0]).toBe('insert_expenditure_idempotent');
    });

    it('should remove mutation from outbox on success', async () => {
      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(null),
      );

      await localRepo.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'expenditure',
        entity_id: 'exp-1',
        payload: { amount: 100 },
        idempotency_key: 'key-1',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });

      await service.processOutbox();

      const pending = await localRepo.getPendingMutations();
      expect(pending.length).toBe(0);
    });

    it('should invalidate queries on successful dispatch', async () => {
      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(null),
      );
      const invalidateSpy = spyOn(queryClient, 'invalidateQueries');

      await localRepo.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'expenditure',
        entity_id: 'exp-1',
        payload: { amount: 100 },
        idempotency_key: 'key-1',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });

      await service.processOutbox();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['expenditure'],
      });
    });

    it('should increment retry count on failure', async () => {
      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(null, new Error('Network error')),
      );

      await localRepo.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'expenditure',
        entity_id: 'exp-1',
        payload: { amount: 100 },
        idempotency_key: 'key-1',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });

      await service.processOutbox();

      const pending = await localRepo.getPendingMutations();
      expect(pending.length).toBe(1);
      expect(pending[0].retry_count).toBe(1);
      expect(pending[0].last_error).toBe('Network error');
    });

    it('should remove mutation when max retries exceeded', async () => {
      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(null, new Error('Fail')),
      );

      await localRepo.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'expenditure',
        entity_id: 'exp-1',
        payload: { amount: 100 },
        idempotency_key: 'key-1',
        retry_count: 5,
        max_retries: 5,
        last_error: 'Previous error',
      });

      await service.processOutbox();

      const pending = await localRepo.getPendingMutations();
      expect(pending.length).toBe(0);
    });

    it('should log a warning when RPC does not exist for entity type', async () => {
      const consoleSpy = spyOn(console, 'warn');
      spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(null, { message: 'RPC not found', code: '42883' }),
      );

      await localRepo.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'unknown_entity',
        entity_id: 'ue-1',
        payload: {},
        idempotency_key: 'key-1',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });

      await service.processOutbox();

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('RPC name mappings', () => {
    it('should map account create/update/delete mutations', async () => {
      const rpcSpy = spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(null),
      );

      await localRepo.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'account',
        entity_id: 'acc-1',
        payload: { name: 'Cash', condominium_id: 'c1' },
        idempotency_key: 'key-acc-create',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });
      await localRepo.enqueueMutation({
        mutation_type: 'update',
        entity_type: 'account',
        entity_id: 'acc-1',
        payload: { name: 'Updated Cash' },
        idempotency_key: 'key-acc-update',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });
      await localRepo.enqueueMutation({
        mutation_type: 'delete',
        entity_type: 'account',
        entity_id: 'acc-1',
        payload: { id: 'acc-1', reversal_reason: 'User deleted' },
        idempotency_key: 'key-acc-delete',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });

      await service.processOutbox();

      expect(rpcSpy.calls.count()).toBe(3);
      expect(rpcSpy.calls.argsFor(0)[0]).toBe('insert_account_idempotent');
      expect(rpcSpy.calls.argsFor(1)[0]).toBe('update_account_idempotent');
      expect(rpcSpy.calls.argsFor(2)[0]).toBe('soft_delete_account');
    });

    it('should map transaction_category create/update/delete mutations', async () => {
      const rpcSpy = spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(null),
      );

      await localRepo.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'transaction_category',
        entity_id: 'cat-1',
        payload: { name: 'Custom', condominium_id: 'c1', category_type: 'expense' },
        idempotency_key: 'key-cat-create',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });
      await localRepo.enqueueMutation({
        mutation_type: 'update',
        entity_type: 'transaction_category',
        entity_id: 'cat-1',
        payload: { name: 'Updated Custom' },
        idempotency_key: 'key-cat-update',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });
      await localRepo.enqueueMutation({
        mutation_type: 'delete',
        entity_type: 'transaction_category',
        entity_id: 'cat-1',
        payload: { id: 'cat-1', reversal_reason: 'User deleted' },
        idempotency_key: 'key-cat-delete',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });

      await service.processOutbox();

      expect(rpcSpy.calls.count()).toBe(3);
      expect(rpcSpy.calls.argsFor(0)[0]).toBe(
        'insert_transaction_category_idempotent',
      );
      expect(rpcSpy.calls.argsFor(1)[0]).toBe(
        'update_transaction_category_idempotent',
      );
      expect(rpcSpy.calls.argsFor(2)[0]).toBe('soft_delete_category');
    });

    it('should pass delete payload id and reversal reason to RPC params', async () => {
      const rpcSpy = spyOn(supabase.client, 'rpc' as any).and.returnValue(
        mockRpc(null),
      );

      await localRepo.enqueueMutation({
        mutation_type: 'delete',
        entity_type: 'transaction_category',
        entity_id: 'cat-1',
        payload: { id: 'cat-1', reversal_reason: 'Test reason' },
        idempotency_key: 'key-cat-delete',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });

      await service.processOutbox();

      expect(rpcSpy.calls.argsFor(0)[1]).toEqual({
        p_id: 'cat-1',
        p_reversal_reason: 'Test reason',
      });
    });
  });

  describe('calculateBackoff()', () => {
    it('should calculate correct backoff for retry 0 (1000ms)', () => {
      expect(calculateBackoff(0)).toBe(1000);
    });

    it('should calculate correct backoff for retry 1 (2000ms)', () => {
      expect(calculateBackoff(1)).toBe(2000);
    });

    it('should calculate correct backoff for retry 2 (4000ms)', () => {
      expect(calculateBackoff(2)).toBe(4000);
    });

    it('should calculate correct backoff for retry 4 (16000ms)', () => {
      expect(calculateBackoff(4)).toBe(16000);
    });
  });
});
