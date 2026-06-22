import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface LocalDBSchema extends DBSchema {
  outbox: {
    key: number;
    value: {
      id: number;
      mutation_type: 'create' | 'update' | 'delete';
      entity_type: string;
      entity_id: string;
      payload: Record<string, unknown>;
      idempotency_key: string;
      created_at: string;
      retry_count: number;
      max_retries: number;
      last_error: string | null;
    };
    indexes: {
      by_created_at: string;
    };
  };
  sync_state: {
    key: string;
    value: {
      key: string;
      last_sync_at: string;
      sync_status: 'idle' | 'syncing' | 'error';
    };
  };
  query_cache: {
    key: string;
    value: {
      key: string;
      data: unknown;
      timestamp: number;
    };
  };
}

const DEFAULT_DB_NAME = 'condomain-local';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LocalDBSchema>> | null = null;
let dbName = DEFAULT_DB_NAME;

/**
 * Override the database name. Used for testing.
 */
export function setTestDbName(name: string): void {
  dbName = name;
}

export function getLocalDB(): Promise<IDBPDatabase<LocalDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<LocalDBSchema>(dbName, DB_VERSION, {
      upgrade(db) {
        // Outbox store (FIFO mutation queue)
        const outboxStore = db.createObjectStore('outbox', {
          keyPath: 'id',
          autoIncrement: true,
        });
        outboxStore.createIndex('by_created_at', 'created_at');

        // Sync state store
        db.createObjectStore('sync_state', { keyPath: 'key' });

        // Query cache store (for TanStack Query persistence)
        db.createObjectStore('query_cache', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

/**
 * Reset the singleton promise. Used for testing to force re-initialization.
 */
export function resetLocalDB(): void {
  dbPromise = null;
}
