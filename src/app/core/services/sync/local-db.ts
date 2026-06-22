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
  entities: {
    key: string; // format: "entityType:entityId"
    value: {
      key: string;
      entity_type: string;
      entity_id: string;
      data: Record<string, unknown>;
      version: number;
      _local_status: 'synced' | 'pending' | 'conflict';
      updated_at: string;
    };
    indexes: {
      'by_entity_type': string;
      'by_entity_id': string;
      'by_status': string;
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

        // Generic entities store (any entity type, keyed by "entityType:entityId")
        const entityStore = db.createObjectStore('entities', { keyPath: 'key' });
        entityStore.createIndex('by_entity_type', 'entity_type');
        entityStore.createIndex('by_entity_id', 'entity_id');
        entityStore.createIndex('by_status', '_local_status');
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
