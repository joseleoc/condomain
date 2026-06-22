import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { getLocalDB, type LocalDBSchema, resetLocalDB, setTestDbName } from './local-db';

describe('LocalDB', () => {
  // Use a unique name per test suite run to avoid stale DB conflicts
  let testDbName: string;

  beforeEach(() => {
    testDbName = `condomain-local-test-${Date.now()}`;
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
    setTestDbName(testDbName);
  });

  afterEach(() => {
    resetLocalDB();
    setTestDbName('condomain-local');
    // Best-effort cleanup — don't block on it
    try {
      indexedDB.deleteDatabase(testDbName);
    } catch {
      // ignore
    }
  });

  describe('getLocalDB()', () => {
    it('should create the database on first call', async () => {
      const db = await getLocalDB();
      expect(db).toBeTruthy();
      expect(db.name).toBe(testDbName);
    });

    it('should return the same database instance on subsequent calls', async () => {
      const db1 = await getLocalDB();
      const db2 = await getLocalDB();
      expect(db1).toBe(db2);
    });

    it('should create the outbox object store with auto-increment key', async () => {
      const db = await getLocalDB();
      const storeNames = db.objectStoreNames;
      expect(storeNames.contains('outbox')).toBeTrue();
    });

    it('should create the sync_state object store', async () => {
      const db = await getLocalDB();
      const storeNames = db.objectStoreNames;
      expect(storeNames.contains('sync_state')).toBeTrue();
    });

    it('should create the query_cache object store', async () => {
      const db = await getLocalDB();
      const storeNames = db.objectStoreNames;
      expect(storeNames.contains('query_cache')).toBeTrue();
    });

    it('should create indexes on the outbox store', async () => {
      const db = await getLocalDB();
      const tx = db.transaction('outbox', 'readonly');
      const indexNames = tx.store.indexNames;
      expect(indexNames.contains('by_created_at')).toBeTrue();
    });
  });
});
