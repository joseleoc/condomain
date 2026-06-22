import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { LocalRepository } from './local-repository';
import { resetLocalDB, setTestDbName } from './local-db';

describe('LocalRepository', () => {
  let repository: LocalRepository;
  let testDbName: string;

  beforeEach(() => {
    testDbName = `condomain-local-repo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTestDbName(testDbName);
    resetLocalDB();

    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
      providers: [LocalRepository],
    });
    repository = TestBed.inject(LocalRepository);
  });

  afterEach(() => {
    resetLocalDB();
    setTestDbName('condomain-local');
    // Best-effort cleanup — don't await
    try {
      indexedDB.deleteDatabase(testDbName);
    } catch {
      // ignore
    }
  });

  describe('enqueueMutation()', () => {
    it('should enqueue a mutation and return a positive integer ID', async () => {
      const id = await repository.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'expenditure',
        entity_id: 'test-entity-1',
        payload: { amount: 100 },
        idempotency_key: 'key-1',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });
      expect(id).toBeGreaterThan(0);
      expect(Number.isInteger(id)).toBeTrue();
    });

    it('should set created_at timestamp on the mutation', async () => {
      await repository.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'expenditure',
        entity_id: 'test-entity-1',
        payload: {},
        idempotency_key: 'key-2',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });
      const mutations = await repository.getPendingMutations();
      expect(mutations.length).toBe(1);
      expect(mutations[0].created_at).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('getPendingMutations()', () => {
    it('should return empty array when outbox is empty', async () => {
      const mutations = await repository.getPendingMutations();
      expect(mutations).toEqual([]);
    });

    it('should return mutations in FIFO order (by created_at)', async () => {
      await repository.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'expenditure',
        entity_id: 'entity-1',
        payload: {},
        idempotency_key: 'fifo-1',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });
      await repository.enqueueMutation({
        mutation_type: 'update',
        entity_type: 'expenditure',
        entity_id: 'entity-2',
        payload: {},
        idempotency_key: 'fifo-2',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });
      await repository.enqueueMutation({
        mutation_type: 'delete',
        entity_type: 'expenditure',
        entity_id: 'entity-3',
        payload: {},
        idempotency_key: 'fifo-3',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });

      const mutations = await repository.getPendingMutations();
      expect(mutations.length).toBe(3);
      expect(mutations[0].idempotency_key).toBe('fifo-1');
      expect(mutations[1].idempotency_key).toBe('fifo-2');
      expect(mutations[2].idempotency_key).toBe('fifo-3');
    });
  });

  describe('deleteMutation()', () => {
    it('should remove a mutation from the outbox', async () => {
      const id = await repository.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'expenditure',
        entity_id: 'test-entity',
        payload: {},
        idempotency_key: 'delete-test',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });

      await repository.deleteMutation(id);

      const mutations = await repository.getPendingMutations();
      expect(mutations.length).toBe(0);
    });
  });

  describe('updateMutationRetry()', () => {
    it('should update retry_count and last_error on a mutation', async () => {
      const id = await repository.enqueueMutation({
        mutation_type: 'create',
        entity_type: 'expenditure',
        entity_id: 'test-entity',
        payload: {},
        idempotency_key: 'retry-test',
        retry_count: 0,
        max_retries: 5,
        last_error: null,
      });

      await repository.updateMutationRetry(id, 2, 'Network timeout');

      const mutations = await repository.getPendingMutations();
      expect(mutations.length).toBe(1);
      expect(mutations[0].retry_count).toBe(2);
      expect(mutations[0].last_error).toBe('Network timeout');
    });
  });

  describe('getLastSyncAt()', () => {
    it('should return undefined for unknown key', async () => {
      const result = await repository.getLastSyncAt('unknown:key');
      expect(result).toBeUndefined();
    });

    it('should return the stored timestamp', async () => {
      const timestamp = '2026-06-20T10:00:00Z';
      await repository.setLastSyncAt('expenditures:abc-123', timestamp);

      const result = await repository.getLastSyncAt('expenditures:abc-123');
      expect(result).toBe(timestamp);
    });
  });

  describe('setLastSyncAt()', () => {
    it('should store sync state with idle status', async () => {
      await repository.setLastSyncAt('profiles:xyz-789', '2026-06-21T12:00:00Z');

      const result = await repository.getLastSyncAt('profiles:xyz-789');
      expect(result).toBe('2026-06-21T12:00:00Z');
    });

    it('should overwrite existing sync state for the same key', async () => {
      await repository.setLastSyncAt('condominiums:def-456', '2026-06-20T10:00:00Z');
      await repository.setLastSyncAt('condominiums:def-456', '2026-06-21T10:00:00Z');

      const result = await repository.getLastSyncAt('condominiums:def-456');
      expect(result).toBe('2026-06-21T10:00:00Z');
    });
  });
});
