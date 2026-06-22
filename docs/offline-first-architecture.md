# Condomain Offline-First: Technical Architecture & Implementation Plan

> **Author**: Staff Software Engineer / Cloud Solutions Architect
> **Date**: June 2026
> **Status**: Proposal — Awaiting Review
> **Target Stack**: Angular 20 / Ionic 8 / Capacitor 8 / Supabase (PostgreSQL 17)

---

## Table of Contents

1. [Technology Justification & Alternatives Analysis](#1-technology-justification--alternatives-analysis)
2. [Implementation Roadmap (Phased)](#2-implementation-roadmap-phased)
3. [Software Architecture: Code & Implementation](#3-software-architecture-code--implementation)
4. [Technical Reference Playbook](#4-technical-reference-playbook)

---

## 1. Technology Justification & Alternatives Analysis

### 1.1 Why Offline-First is Viable with Angular + Ionic + Supabase

The Condomain application manages condominiums where administrators routinely operate in areas with poor connectivity — parking garages, basements, utility rooms — yet must register expenses, reconcile income, and navigate the chart of accounts. An offline-first architecture is not just viable with this stack; it is the **correct architectural choice** for the domain.

**Why it works:**

| Concern | Resolution |
|---|---|
| **Local persistence** | Capacitor provides native SQLite via `@capacitor/sqlite` or browser IndexedDB via `idb`/`localforage`. Both are production-grade. |
| **Reactive state** | Angular's RxJS ecosystem (BehaviorSubjects, Signals) maps naturally to local database change streams. |
| **Server sync** | Supabase's PostgreSQL backend supports row-level versioning (`updated_at`, `xmin`), RLS policies, and real-time subscriptions — all required for bidirectional sync. |
| **Network awareness** | `@capacitor/network` provides reliable connectivity events on native platforms; the browser `navigator.onLine` API covers web. |
| **Mutation queuing** | The Outbox Pattern is implementation-agnostic — a local IndexedDB table or SQLite table serves as a persistent FIFO queue. |
| **Conflict resolution** | PostgreSQL's ACID guarantees + application-level conflict strategies (LWW, business-rule merge) resolve collisions deterministically. |

**The fundamental insight**: Offline-first is not a library problem — it is an **architecture pattern**. The libraries are just plumbing. The pattern consists of:

1. **Local truth** — the device's local database is the source of truth for reading.
2. **Optimistic writes** — mutations are applied locally first, then dispatched to the server.
3. **Sync engine** — a background process reconciles local state with server state.
4. **Conflict resolution** — deterministic rules handle simultaneous edits.

### 1.2 Alternatives Comparison

| Criterion | **WatermelonDB** | **SQLite (Capacitor) + Custom Repos** | **RxDB** | **PowerSync** | **TanStack Query + IndexedDB (idb)** |
|---|---|---|---|---|---|
| **Architecture** | Reactive ORM with sync protocol | Raw/native SQLite + Angular repository layer | Reactive NoSQL-style DB with RxJS-first API | Managed sync service (SaaS or self-hosted) | Server-state cache + manual local persistence |
| **Sync with Supabase** | Requires custom sync adapter (no built-in Supabase support) | Full manual control — write your own sync logic | Custom replication plugin required | **Native Supabase support** — built-in connector | Manual — you build the sync layer |
| **Relational integrity** | ✅ Full FK support, schema migrations | ✅ Full PostgreSQL-compatible SQLite | ⚠️ Schema-based but NoSQL-style collections | ✅ Relational sync, FK-aware | ❌ No built-in relational model |
| **Performance (10k+ rows)** | ✅ Excellent — native SQLite under the hood | ✅ Excellent — direct SQLite access | ⚠️ Good but RxJS overhead at scale | ✅ Excellent — optimized sync engine | ⚠️ IndexedDB is slower than SQLite on mobile |
| **TypeScript / Angular fit** | ⚠️ React-focused docs, Angular community support exists | ✅ Full TypeScript, native Angular patterns | ✅ RxJS-native, excellent Angular integration | ✅ TypeScript SDK, framework-agnostic | ✅ First-class Angular Query support |
| **Mutation queue (Outbox)** | Built-in via sync protocol | Manual — you implement the queue table | Built-in via replication protocol | Built-in — PowerSync manages the queue | Manual — TanStack Query `persist` + custom queue |
| **Conflict resolution** | Custom sync handler | Full control — implement any strategy | Custom conflict handler in replication | Server-resolved via sync engine | Manual — you implement |
| **Offline query capability** | ✅ Full SQL queries offline | ✅ Full SQL queries offline | ✅ Mango queries offline | ✅ SQL queries offline | ❌ Cache only — no offline query engine |
| **Bundle size** | ~150KB + SQLite native | ~50KB (Capacitor plugin) | ~200KB + RxJS | ~100KB SDK | ~30KB (TanStack Query) + ~10KB (idb) |
| **Learning curve** | Medium — new ORM concepts | Low — standard SQLite + Angular | Medium — RxDB concepts | Low — managed service | Low — familiar patterns |
| **Vendor lock-in** | None | None | None | **High** — PowerSync is a service | None |
| **Cost** | Free (open source) | Free | Free (open source) | Free tier → paid at scale | Free (open source) |
| **Maturity** | Stable, active community | Stable, Capacitor official | Stable, active development | Growing, backed by VC | Very mature, industry standard |

### 1.3 Recommended Architecture: **TanStack Query (Angular Query) + IndexedDB (idb) + Custom Sync Layer**

**Decision rationale:**

After evaluating all alternatives against Condomain's specific requirements — hierarchical accounting trees, multi-currency transactions, strict RLS, immutable audit trails, and a team already invested in Angular/RxJS — the recommended approach is:

> **TanStack Query (`@tanstack/angular-query-experimental`) as the server-state management and caching layer, paired with `idb` (promised-based IndexedDB wrapper) for local persistence, and a custom `SyncService` that implements the Outbox Pattern for deferred mutations.**

**Why NOT the others:**

- **WatermelonDB**: Excellent for React Native, but Angular support is community-maintained. The sync adapter would need to be built from scratch for Supabase. Overkill for our use case.
- **SQLite (Capacitor) + Custom Repos**: Viable, but adds native plugin complexity. IndexedDB is sufficient for our data volume (condominium accounting data fits comfortably in IndexedDB's ~50MB+ quota). SQLite becomes necessary only when you need >100MB local storage or complex SQL joins that IndexedDB struggles with.
- **RxDB**: Powerful but introduces a second reactive layer on top of Angular's RxJS. The cognitive load is high, and the NoSQL-style collections don't map cleanly to our relational Supabase schema.
- **PowerSync**: The strongest contender for managed sync. However, it introduces vendor lock-in, adds operational complexity (self-hosted sync server or SaaS dependency), and the free tier has limits. For a project that needs full control over conflict resolution (critical for accounting integrity), building our own sync layer is preferable.

**Why TanStack Query + IndexedDB wins:**

1. **TanStack Query** is the **industry standard** for server-state management. It provides:
   - Automatic background refetching on network recovery
   - Mutation retries with exponential backoff
   - Optimistic updates via `onMutate`
   - Persistent cache via `persistQueryClient` (with IndexedDB adapter)
   - Query invalidation and refetch orchestration
   - DevTools for debugging sync state

2. **IndexedDB via `idb`** provides:
   - Sufficient storage for condominium accounting data (thousands of transactions, chart of accounts, properties)
   - Native browser support — no native plugin required for web
   - Transaction support (ACID-like within a single database)
   - Can be paired with `@capacitor/preferences` for small metadata

3. **Custom SyncService** gives us:
   - Full control over conflict resolution (critical for accounting — you cannot afford "last write wins" on financial records)
   - Outbox Pattern implementation tailored to our domain (idempotent mutations, FIFO ordering, retry with backoff)
   - No vendor lock-in — the sync logic is ours to adapt

**TanStack Query's role in this architecture:**

```
┌─────────────────────────────────────────────────────────┐
│                    Angular Components                    │
│  (read from Query cache, trigger mutations)              │
├─────────────────────────────────────────────────────────┤
│              TanStack Query (Angular Query)               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Query Cache │  │MutationCache │  │  Persist Layer │ │
│  │ (in-memory) │  │ (outbox +    │  │  (idb-backed)  │ │
│  │             │  │  retry)      │  │                │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬───────┘ │
│         │                │                    │         │
├─────────┼────────────────┼────────────────────┼─────────┤
│         ▼                ▼                    ▼         │
│    SyncService ──► Outbox Table ──► Network Dispatch    │
├─────────────────────────────────────────────────────────┤
│              Supabase Client (HTTP/WS)                   │
├─────────────────────────────────────────────────────────┤
│              Supabase Backend (PostgreSQL 17)            │
└─────────────────────────────────────────────────────────┘
```

TanStack Query acts as the **orchestrator**:
- **Queries**: Fetch from cache (instant) → validate with network (background) → update cache.
- **Mutations**: Apply optimistically to cache → persist to outbox → dispatch to server → retry on failure → invalidate affected queries on success.
- **Persistence**: Cache survives page reloads via IndexedDB persist adapter.

---

## 2. Implementation Roadmap (Phased)

### Phase 1: Backend Preparation (Supabase)

**Goal**: Prepare the PostgreSQL schema for conflict detection, idempotent operations, and efficient delta sync.

#### 1.1 Add Sync Metadata Columns

Every table that participates in offline sync needs version tracking:

```sql
-- Add to all sync-participating tables
ALTER TABLE expenditures
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by UUID NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS idempotency_key UUID NOT NULL DEFAULT gen_random_uuid();

-- Index for delta sync
CREATE INDEX IF NOT EXISTS idx_expenditures_updated_at
  ON expenditures (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenditures_idempotency_key
  ON expenditures (idempotency_key);
```

**Column purposes:**

| Column | Purpose |
|---|---|
| `updated_at` | Timestamp for delta sync — "give me everything changed since T" |
| `version` | Logical version number — incremented on each update, used for conflict detection |
| `created_by` | Audit trail — which user created this record |
| `idempotency_key` | Idempotent operations — prevents duplicate inserts if the same mutation is retried |

#### 1.2 PostgreSQL Trigger for Version Auto-Increment

```sql
CREATE OR REPLACE FUNCTION increment_version_on_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all sync tables
CREATE TRIGGER trg_expenditures_version
  BEFORE UPDATE ON expenditures
  FOR EACH ROW
  EXECUTE FUNCTION increment_version_on_update();
```

#### 1.3 Idempotent Insert Function

```sql
-- Prevents duplicate inserts when the same mutation is retried
CREATE OR REPLACE FUNCTION insert_expenditure_idempotent(
  p_idempotency_key UUID,
  p_condominium_id UUID,
  p_account_id UUID,
  p_amount NUMERIC,
  p_currency VARCHAR(3),
  p_exchange_rate NUMERIC,
  p_description TEXT,
  p_created_by UUID
)
RETURNS expenditures AS $$
DECLARE
  v_existing expenditures;
BEGIN
  -- Check if this mutation was already applied
  SELECT * INTO v_existing
  FROM expenditures
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_existing;
  END IF;

  -- Insert new record
  INSERT INTO expenditures (
    idempotency_key, condominium_id, account_id, amount,
    currency, exchange_rate, description, created_by
  ) VALUES (
    p_idempotency_key, p_condominium_id, p_account_id, p_amount,
    p_currency, p_exchange_rate, p_description, p_created_by
  )
  RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 1.4 Delta Sync Function

```sql
-- Returns all rows changed since a given timestamp
CREATE OR REPLACE FUNCTION get_expenditures_delta(
  p_condominium_id UUID,
  p_since TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  condominium_id UUID,
  account_id UUID,
  amount NUMERIC,
  currency VARCHAR(3),
  exchange_rate NUMERIC,
  description TEXT,
  created_by UUID,
  version BIGINT,
  updated_at TIMESTAMPTZ,
  operation TEXT -- 'INSERT', 'UPDATE', 'DELETE' (soft)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, e.condominium_id, e.account_id, e.amount,
    e.currency, e.exchange_rate, e.description,
    e.created_by, e.version, e.updated_at,
    CASE
      WHEN e.deleted_at IS NOT NULL THEN 'DELETE'
      WHEN e.version = 1 THEN 'INSERT'
      ELSE 'UPDATE'
    END AS operation
  FROM expenditures e
  WHERE e.condominium_id = p_condominium_id
    AND e.updated_at > p_since
  ORDER BY e.updated_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 1.5 Soft Delete for Immutability

```sql
-- Instead of DELETE, mark as deleted
ALTER TABLE expenditures
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION soft_delete_expenditure(
  p_id UUID,
  p_reversal_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE expenditures
  SET deleted_at = NOW(),
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Phase 2: Local Storage Layer (Client)

**Goal**: Set up IndexedDB as the local persistence engine with schemas mirroring Supabase tables.

#### 2.1 Install Dependencies

```bash
pnpm add @tanstack/angular-query-experimental idb
pnpm add -D @tanstack/angular-query-devtools-experimental
```

#### 2.2 IndexedDB Schema Definition

```typescript
// src/app/core/services/sync/local-db.ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface LocalDBSchema extends DBSchema {
  expenditures: {
    key: string; // UUID
    value: {
      id: string;
      condominium_id: string;
      account_id: string;
      amount: number;
      currency: string;
      exchange_rate: number;
      description: string;
      created_by: string;
      version: number;
      updated_at: string; // ISO 8601
      deleted_at: string | null;
      _local_status: 'synced' | 'pending' | 'conflict';
      _local_created_at: string;
    };
    indexes: {
      'by_condominium': string;
      'by_updated_at': string;
      'by_status': string;
    };
  };
  outbox: {
    key: number; // auto-increment
    value: {
      id: number;
      mutation_type: 'create' | 'update' | 'delete';
      entity_type: 'expenditure' | 'income' | 'account';
      entity_id: string;
      payload: Record<string, unknown>;
      idempotency_key: string;
      created_at: string;
      retry_count: number;
      max_retries: number;
      last_error: string | null;
    };
    indexes: {
      'by_created_at': string;
      'by_status': string;
    };
  };
  sync_state: {
    key: string; // entity_type + condominium_id
    value: {
      key: string;
      last_sync_at: string; // ISO 8601
      sync_status: 'idle' | 'syncing' | 'error';
    };
  };
}

const DB_NAME = 'condomain-local';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LocalDBSchema>> | null = null;

export function getLocalDB(): Promise<IDBPDatabase<LocalDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<LocalDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Expenditures store
        const expenditureStore = db.createObjectStore('expenditures', {
          keyPath: 'id',
        });
        expenditureStore.createIndex('by_condominium', 'condominium_id');
        expenditureStore.createIndex('by_updated_at', 'updated_at');
        expenditureStore.createIndex('by_status', '_local_status');

        // Outbox store (FIFO queue)
        const outboxStore = db.createObjectStore('outbox', {
          keyPath: 'id',
          autoIncrement: true,
        });
        outboxStore.createIndex('by_created_at', 'created_at');

        // Sync state store
        db.createObjectStore('sync_state', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}
```

#### 2.3 Repository Pattern for Local Data

```typescript
// src/app/core/services/sync/local-repository.ts
import { inject, Injectable } from '@angular/core';
import { getLocalDB, type LocalDBSchema } from './local-db';
import type { IDBPDatabase } from 'idb';

@Injectable({ providedIn: 'root' })
export class LocalRepository {
  async getExpendituresByCondominium(
    condominiumId: string,
  ): Promise<LocalDBSchema['expenditures']['value'][]> {
    const db = await getLocalDB();
    const tx = db.transaction('expenditures', 'readonly');
    const index = tx.store.index('by_condominium');
    const results = await index.getAll(condominiumId);
    return results.filter((e) => e.deleted_at === null);
  }

  async upsertExpenditure(
    expenditure: LocalDBSchema['expenditures']['value'],
  ): Promise<void> {
    const db = await getLocalDB();
    await db.put('expenditures', expenditure);
  }

  async enqueueMutation(
    mutation: Omit<LocalDBSchema['outbox']['value'], 'id' | 'created_at'>,
  ): Promise<number> {
    const db = await getLocalDB();
    return db.add('outbox', {
      ...mutation,
      created_at: new Date().toISOString(),
    });
  }

  async getPendingMutations(): Promise<
    LocalDBSchema['outbox']['value'][]
  > {
    const db = await getLocalDB();
    const tx = db.transaction('outbox', 'readonly');
    const index = tx.store.index('by_created_at');
    return index.getAll();
  }

  async deleteMutation(id: number): Promise<void> {
    const db = await getLocalDB();
    await db.delete('outbox', id);
  }

  async updateMutationRetry(
    id: number,
    retryCount: number,
    error: string | null,
  ): Promise<void> {
    const db = await getLocalDB();
    const tx = db.transaction('outbox', 'readwrite');
    const existing = await tx.store.get(id);
    if (existing) {
      existing.retry_count = retryCount;
      existing.last_error = error;
      await tx.store.put(existing);
    }
  }

  async getLastSyncAt(
    key: string,
  ): Promise<string | undefined> {
    const db = await getLocalDB();
    const state = await db.get('sync_state', key);
    return state?.last_sync_at;
  }

  async setLastSyncAt(key: string, timestamp: string): Promise<void> {
    const db = await getLocalDB();
    await db.put('sync_state', {
      key,
      last_sync_at: timestamp,
      sync_status: 'idle',
    });
  }
}
```

### Phase 3: Mutation Queue (Outbox Pattern)

**Goal**: Capture user write actions while offline, persist them in a local FIFO queue, and dispatch them chronologically when connectivity is restored.

#### 3.1 Outbox Pattern Implementation

The Outbox Pattern ensures that every user action is **durably recorded** before being dispatched to the server. This guarantees **at-least-once delivery** and prevents data loss if the app crashes mid-sync.

```
User Action → Apply Locally (Optimistic) → Enqueue to Outbox → Dispatch to Server
                      ↑                                              │
                      └────────────────── On Success ────────────────┘
                                              ↓
                                    Remove from Outbox
                                    Invalidate Queries
```

#### 3.2 Integration with TanStack Query

```typescript
// src/app/core/services/sync/sync-service.ts
import { inject, Injectable } from '@angular/core';
import { Network } from '@capacitor/network';
import type { NetworkStatus } from '@capacitor/network';
import { LocalRepository } from './local-repository';
import { Supabase } from '@services/supabase';
import {
  QueryClient,
  injectMutation,
} from '@tanstack/angular-query-experimental';
import { firstValueFrom, fromEvent, merge } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SyncService {
  #localRepo = inject(LocalRepository);
  #supabase = inject(Supabase);
  #queryClient = inject(QueryClient);
  #isOnline = true;

  constructor() {
    this.#initNetworkListener();
    this.#processOutboxOnReconnect();
  }

  async #initNetworkListener(): Promise<void> {
    const status = await Network.getStatus();
    this.#isOnline = status.connected;

    Network.addListener('networkStatusChange', (newStatus: NetworkStatus) => {
      const wasOffline = !this.#isOnline;
      this.#isOnline = newStatus.connected;

      if (wasOffline && this.#isOnline) {
        this.#processOutbox();
      }
    });
  }

  isOnline(): boolean {
    return this.#isOnline;
  }

  /**
   * Enqueue a mutation to the outbox for deferred dispatch.
   * Called by TanStack Query's mutation onError handler.
   */
  async enqueueMutation(
    mutationType: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<void> {
    await this.#localRepo.enqueueMutation({
      mutation_type: mutationType,
      entity_type: entityType,
      entity_id: entityId,
      payload,
      idempotency_key: idempotencyKey,
      retry_count: 0,
      max_retries: 5,
      last_error: null,
    });
  }

  /**
   * Process the outbox FIFO queue.
   * Dispatches mutations in chronological order with retry logic.
   */
  async #processOutbox(): Promise<void> {
    const pending = await this.#localRepo.getPendingMutations();

    for (const mutation of pending) {
      if (mutation.retry_count >= mutation.max_retries) {
        // Mark as failed, remove from queue
        await this.#localRepo.deleteMutation(mutation.id);
        continue;
      }

      try {
        await this.#dispatchMutation(mutation);
        await this.#localRepo.deleteMutation(mutation.id);

        // Invalidate affected queries to refresh from server
        this.#queryClient.invalidateQueries({
          queryKey: [mutation.entity_type],
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await this.#localRepo.updateMutationRetry(
          mutation.id,
          mutation.retry_count + 1,
          errorMessage,
        );

        // Exponential backoff before next attempt
        const delay = Math.pow(2, mutation.retry_count) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async #dispatchMutation(
    mutation: LocalDBSchema['outbox']['value'],
  ): Promise<void> {
    const { entity_type, mutation_type, payload, idempotency_key } = mutation;

    switch (entity_type) {
      case 'expenditure':
        if (mutation_type === 'create') {
          const { data, error } = await this.#supabase.client.rpc(
            'insert_expenditure_idempotent',
            {
              p_idempotency_key: idempotency_key,
              p_condominium_id: payload.condominium_id,
              p_account_id: payload.account_id,
              p_amount: payload.amount,
              p_currency: payload.currency,
              p_exchange_rate: payload.exchange_rate,
              p_description: payload.description,
              p_created_by: payload.created_by,
            },
          );
          if (error) throw error;
        }
        break;
      // Add other entity types as needed
    }
  }

  #processOutboxOnReconnect(): void {
    // Process any pending mutations on app start if online
    if (this.#isOnline) {
      this.#processOutbox();
    }
  }
}
```

### Phase 4: Bidirectional Sync & Conflict Resolution

**Goal**: Implement the sync algorithm that reconciles local state with server state, handling collisions deterministically.

#### 4.1 Sync Algorithm

```
┌──────────────────────────────────────────────────────────┐
│                    SYNC ALGORITHM                         │
│                                                          │
│  1. Capture local mutations (outbox)                     │
│  2. Fetch server delta since last sync timestamp         │
│  3. Apply server changes to local DB                     │
│  4. Detect conflicts (same row, different versions)      │
│  5. Resolve conflicts per business rules                 │
│  6. Dispatch local mutations to server                   │
│  7. Update last_sync_at timestamp                        │
│  8. Invalidate TanStack Query cache                      │
└──────────────────────────────────────────────────────────┘
```

#### 4.2 Conflict Resolution Strategy

For Condomain's accounting domain, **Last-Write-Wins (LWW) is NOT acceptable** for financial records. The conflict resolution strategy must be **business-rule-driven**:

| Scenario | Resolution Strategy |
|---|---|
| **Same expenditure, different fields** | Merge non-conflicting fields. For conflicting fields, use server version (server is authoritative for financial data). |
| **Same expenditure, same field modified** | Server wins — the server's version number is higher. Log the conflict for audit. |
| **Local insert vs. server delete** | Conflict — local insert is rejected, user is notified. |
| **Local delete vs. server update** | Server wins — the update is applied, then a soft-delete reversal transaction is created. |
| **Two users modify different expenditures** | No conflict — both apply independently. |
| **Chart of accounts modification** | Server wins — account structure changes are admin-only and should propagate. |

```typescript
// src/app/core/services/sync/conflict-resolver.ts
import { Injectable } from '@angular/core';

export interface ConflictRecord {
  entity_type: string;
  entity_id: string;
  local_version: number;
  server_version: number;
  local_data: Record<string, unknown>;
  server_data: Record<string, unknown>;
  resolution: 'server_wins' | 'merge' | 'manual_required';
  resolved_at: string;
}

@Injectable({ providedIn: 'root' })
export class ConflictResolver {
  #conflictLog: ConflictRecord[] = [];

  /**
   * Resolve a conflict between local and server versions of the same entity.
   * For accounting data, server is authoritative.
   */
  resolve<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    localVersion: number,
    serverVersion: number,
    localData: T,
    serverData: T,
  ): { winner: T; resolution: string; conflict: ConflictRecord } {
    if (serverVersion > localVersion) {
      // Server has a newer version — server wins
      const conflict: ConflictRecord = {
        entity_type: entityType,
        entity_id: entityId,
        local_version: localVersion,
        server_version: serverVersion,
        local_data: localData,
        server_data: serverData,
        resolution: 'server_wins',
        resolved_at: new Date().toISOString(),
      };
      this.#conflictLog.push(conflict);

      return {
        winner: serverData,
        resolution: 'server_wins',
        conflict,
      };
    }

    // Local is newer or equal — this shouldn't happen in normal sync
    // (local mutations go through outbox, server should always be ahead)
    // If it does, treat as manual conflict
    const conflict: ConflictRecord = {
      entity_type: entityType,
      entity_id: entityId,
      local_version: localVersion,
      server_version: serverVersion,
      local_data: localData,
      server_data: serverData,
      resolution: 'manual_required',
      resolved_at: new Date().toISOString(),
    };
    this.#conflictLog.push(conflict);

    return {
      winner: serverData, // Default to server for safety
      resolution: 'manual_required',
      conflict,
    };
  }

  getConflictLog(): ConflictRecord[] {
    return [...this.#conflictLog];
  }
}
```

#### 4.3 Full Sync Orchestrator

```typescript
// src/app/core/services/sync/sync-orchestrator.ts
import { inject, Injectable } from '@angular/core';
import { LocalRepository } from './local-repository';
import { ConflictResolver } from './conflict-resolver';
import { Supabase } from '@services/supabase';
import { QueryClient } from '@tanstack/angular-query-experimental';

@Injectable({ providedIn: 'root' })
export class SyncOrchestrator {
  #localRepo = inject(LocalRepository);
  #conflictResolver = inject(ConflictResolver);
  #supabase = inject(Supabase);
  #queryClient = inject(QueryClient);

  /**
   * Full bidirectional sync for a specific entity type and condominium.
   */
  async sync(
    entityType: string,
    condominiumId: string,
  ): Promise<{ synced: number; conflicts: number }> {
    const syncKey = `${entityType}:${condominiumId}`;
    const lastSyncAt = await this.#localRepo.getLastSyncAt(syncKey);
    const since = lastSyncAt ?? '1970-01-01T00:00:00Z';

    let conflicts = 0;

    // Step 1: Fetch server delta
    const { data: serverDelta, error } = await this.#supabase.client.rpc(
      `get_${entityType}_delta`,
      {
        p_condominium_id: condominiumId,
        p_since: since,
      },
    );

    if (error) {
      throw new Error(`Sync failed: ${error.message}`);
    }

    // Step 2: Apply server changes to local DB
    if (serverDelta && serverDelta.length > 0) {
      for (const serverRow of serverDelta) {
        const localRow = await this.#localRepo.getById(
          entityType,
          serverRow.id,
        );

        if (localRow && localRow.version !== serverRow.version) {
          // Conflict detected
          const resolution = this.#conflictResolver.resolve(
            entityType,
            serverRow.id,
            localRow.version,
            serverRow.version,
            localRow,
            serverRow,
          );

          if (resolution.resolution === 'server_wins') {
            await this.#localRepo.upsert(entityType, {
              ...serverRow,
              _local_status: 'synced',
            });
            conflicts++;
          }
        } else {
          // No conflict — apply server change
          await this.#localRepo.upsert(entityType, {
            ...serverRow,
            _local_status: 'synced',
          });
        }
      }
    }

    // Step 3: Update sync timestamp
    await this.#localRepo.setLastSyncAt(syncKey, new Date().toISOString());

    // Step 4: Invalidate TanStack Query cache
    this.#queryClient.invalidateQueries({
      queryKey: [entityType, condominiumId],
    });

    return {
      synced: serverDelta?.length ?? 0,
      conflicts,
    };
  }
}
```

---

## 3. Software Architecture: Code & Implementation

### 3.1 TanStack Query Provider Setup

```typescript
// src/app/core/providers/query.provider.ts
import {
  provideTanStackQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { persistQueryClientSave } from '@tanstack/query-persist-client-core';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { getLocalDB } from '../services/sync/local-db';

// Create a custom IndexedDB persister for TanStack Query
function createIndexedDBPersister() {
  return {
    persistClient: async (client: unknown) => {
      const db = await getLocalDB();
      await db.put('query_cache', {
        key: 'tanstack-query',
        data: client,
        timestamp: Date.now(),
      });
    },
    restoreClient: async () => {
      const db = await getLocalDB();
      const cached = await db.get('query_cache', 'tanstack-query');
      return cached?.data ?? null;
    },
    removeClient: async () => {
      const db = await getLocalDB();
      await db.delete('query_cache', 'tanstack-query');
    },
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes when online
      staleTime: 1000 * 60 * 5,
      // Retry 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus when offline
      refetchOnWindowFocus: () => navigator.onLine,
    },
    mutations: {
      retry: 3,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export const provideQuery = () =>
  provideTanStackQuery(queryClient);
```

### 3.2 Expenditure Service with TanStack Query

```typescript
// src/app/core/services/expenditure.service.ts
import { inject, Injectable } from '@angular/core';
import {
  injectMutation,
  injectQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { Supabase } from '@services/supabase';
import { SyncService } from './sync/sync-service';
import { LocalRepository } from './sync/local-repository';
import { v4 as uuidv4 } from 'uuid';
import type { CreateExpenditureDto } from '@app-types/expenditure';

@Injectable({ providedIn: 'root' })
export class ExpenditureService {
  #supabase = inject(Supabase);
  #syncService = inject(SyncService);
  #localRepo = inject(LocalRepository);
  #queryClient = inject(QueryClient);

  /**
   * Query: Fetch expenditures for a condominium.
   * Reads from cache first, validates with network in background.
   */
  getExpenditures(condominiumId: string) {
    return injectQuery(() => ({
      queryKey: ['expenditures', condominiumId],
      queryFn: async () => {
        // If offline, read from local DB
        if (!this.#syncService.isOnline()) {
          return this.#localRepo.getExpendituresByCondominium(condominiumId);
        }

        // Online: fetch from Supabase
        const { data, error } = await this.#supabase.client
          .from('expenditures')
          .select('*')
          .eq('condominium_id', condominiumId)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        // Update local cache
        for (const expenditure of data) {
          await this.#localRepo.upsertExpenditure({
            ...expenditure,
            _local_status: 'synced',
            _local_created_at: new Date().toISOString(),
          });
        }

        return data;
      },
      // Use cached data immediately, refetch in background
      staleTime: 1000 * 60 * 5,
    }));
  }

  /**
   * Mutation: Create a new expenditure.
   * Uses optimistic updates + outbox pattern for offline support.
   */
  createExpenditure() {
    return injectMutation(() => ({
      mutationFn: async (dto: CreateExpenditureDto) => {
        const idempotencyKey = uuidv4();

        // If offline, enqueue to outbox and apply locally
        if (!this.#syncService.isOnline()) {
          const localExpenditure = {
            id: uuidv4(),
            condominium_id: dto.condominiumId,
            account_id: dto.accountId,
            amount: dto.amount,
            currency: dto.currency,
            exchange_rate: dto.exchangeRate,
            description: dto.description,
            created_by: dto.createdBy,
            version: 1,
            updated_at: new Date().toISOString(),
            deleted_at: null,
            _local_status: 'pending' as const,
            _local_created_at: new Date().toISOString(),
          };

          // Apply locally (optimistic)
          await this.#localRepo.upsertExpenditure(localExpenditure);

          // Enqueue for deferred dispatch
          await this.#syncService.enqueueMutation(
            'create',
            'expenditure',
            localExpenditure.id,
            {
              condominium_id: dto.condominiumId,
              account_id: dto.accountId,
              amount: dto.amount,
              currency: dto.currency,
              exchange_rate: dto.exchangeRate,
              description: dto.description,
              created_by: dto.createdBy,
            },
            idempotencyKey,
          );

          return localExpenditure;
        }

        // Online: dispatch to server via idempotent RPC
        const { data, error } = await this.#supabase.client.rpc(
          'insert_expenditure_idempotent',
          {
            p_idempotency_key: idempotencyKey,
            p_condominium_id: dto.condominiumId,
            p_account_id: dto.accountId,
            p_amount: dto.amount,
            p_currency: dto.currency,
            p_exchange_rate: dto.exchangeRate,
            p_description: dto.description,
            p_created_by: dto.createdBy,
          },
        );

        if (error) throw error;

        // Update local cache
        await this.#localRepo.upsertExpenditure({
          ...data,
          _local_status: 'synced',
          _local_created_at: new Date().toISOString(),
        });

        return data;
      },
      // Optimistic update: add to cache immediately
      onMutate: async (dto) => {
        // Cancel outgoing refetches to avoid race conditions
        await this.#queryClient.cancelQueries({
          queryKey: ['expenditures', dto.condominiumId],
        });

        // Snapshot current cache for rollback
        const previousExpenditures =
          this.#queryClient.getQueryData(['expenditures', dto.condominiumId]);

        // Optimistically add to cache
        this.#queryClient.setQueryData(
          ['expenditures', dto.condominiumId],
          (old: any[] | undefined) => [
            ...(old ?? []),
            {
              id: 'optimistic-' + Date.now(),
              ...dto,
              _local_status: 'pending',
            },
          ],
        );

        return { previousExpenditures };
      },
      // On error: rollback optimistic update + enqueue to outbox
      onError: (err, dto, context) => {
        // Rollback cache
        if (context?.previousExpenditures) {
          this.#queryClient.setQueryData(
            ['expenditures', dto.condominiumId],
            context.previousExpenditures,
          );
        }
      },
      // On success: invalidate to refetch fresh data
      onSuccess: () => {
        this.#queryClient.invalidateQueries({
          queryKey: ['expenditures'],
        });
      },
    }));
  }
}
```

### 3.3 Component Usage

```typescript
// src/app/features/accounting/pages/expenditure-list/expenditure-list.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ExpenditureService } from '@services/expenditure.service';
import { SyncService } from '@services/sync/sync-service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-expenditure-list',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './expenditure-list.component.html',
})
export class ExpenditureListComponent {
  #expenditureService = inject(ExpenditureService);
  #syncService = inject(SyncService);

  readonly isOnline = signal(this.#syncService.isOnline());
  readonly condominiumId = 'some-condo-id'; // From active condominium service

  // Query result as a signal
  readonly expendituresQuery =
    this.#expenditureService.getExpenditures(this.condominiumId);
  readonly expenditures = toSignal(
    this.expendituresQuery.data$,
    { initialValue: [] },
  );
  readonly isLoading = toSignal(this.expendituresQuery.isLoading$, {
    initialValue: false,
  });

  // Mutation
  readonly createMutation = this.#expenditureService.createExpenditure();

  async onCreateExpenditure(dto: CreateExpenditureDto): Promise<void> {
    this.createMutation.mutate(dto);
  }
}
```

### 3.4 Hierarchical Chart of Accounts (Offline)

```typescript
// src/app/core/services/account-tree.service.ts
import { inject, Injectable, computed, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { Supabase } from '@services/supabase';
import { SyncService } from './sync/sync-service';
import { LocalRepository } from './sync/local-repository';

export interface AccountNode {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id: string | null;
  level: number;
  balance: number;
  children: AccountNode[];
}

@Injectable({ providedIn: 'root' })
export class AccountTreeService {
  #supabase = inject(Supabase);
  #syncService = inject(SyncService);
  #localRepo = inject(LocalRepository);

  /**
   * Fetch accounts and build the hierarchical tree.
   * Works offline by reading from local IndexedDB.
   */
  getAccountTree(condominiumId: string) {
    return injectQuery(() => ({
      queryKey: ['accounts', condominiumId],
      queryFn: async (): Promise<AccountNode[]> => {
        let accounts: any[];

        if (!this.#syncService.isOnline()) {
          // Offline: read from local DB
          accounts = await this.#localRepo.getAccountsByCondominium(
            condominiumId,
          );
        } else {
          // Online: fetch from Supabase
          const { data, error } = await this.#supabase.client
            .from('accounts')
            .select('*')
            .eq('condominium_id', condominiumId)
            .order('code');

          if (error) throw error;
          accounts = data;
        }

        return this.#buildTree(accounts);
      },
      staleTime: 1000 * 60 * 30, // Accounts change infrequently
    }));
  }

  /**
   * Build a hierarchical tree from a flat list of accounts.
   * Uses a Map for O(n) tree construction.
   */
  #buildTree(flatAccounts: any[]): AccountNode[] {
    const nodeMap = new Map<string, AccountNode>();
    const roots: AccountNode[] = [];

    // First pass: create all nodes
    for (const account of flatAccounts) {
      const node: AccountNode = {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        parent_id: account.parent_id,
        level: account.level ?? 0,
        balance: account.balance ?? 0,
        children: [],
      };
      nodeMap.set(account.id, node);
    }

    // Second pass: link children to parents
    for (const node of nodeMap.values()) {
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        const parent = nodeMap.get(node.parent_id)!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort children by code
    const sortChildren = (nodes: AccountNode[]): void => {
      nodes.sort((a, b) => a.code.localeCompare(b.code));
      for (const node of nodes) {
        sortChildren(node.children);
      }
    };
    sortChildren(roots);

    return roots;
  }
}
```

---

## 4. Technical Reference Playbook

### 4.1 What is Offline-First in the Context of Condomain?

**Offline-First** means the application is designed to be **fully functional without an internet connection**. The local device's database is the **primary source of truth** for reading data. The server (Supabase) is a **synchronization target**, not a dependency for basic operations.

In Condomain's context:
- An administrator in a basement parking garage can register an expenditure, view the chart of accounts, and reconcile income — all without connectivity.
- When the device reconnects, a background sync process reconciles local changes with the server, resolving conflicts deterministically.
- The user **never sees a loading spinner** because of network issues — data is always available locally.

### 4.2 Benefits (UX & Reliability)

| Benefit | Description |
|---|---|
| **Zero-latency reads** | Data is read from IndexedDB (milliseconds), not fetched over HTTP (hundreds of milliseconds to seconds). |
| **Basement/parking garage support** | Condominium administrators frequently operate in areas with poor cellular coverage. Offline-first ensures uninterrupted workflow. |
| **Resilience to network flakiness** | Brief disconnections don't interrupt the user — mutations are queued and dispatched when stable. |
| **Reduced server load** | Read queries hit the local cache, not Supabase. Only mutations and periodic syncs hit the server. |
| **Better perceived performance** | Optimistic updates make the app feel instant — the UI updates immediately, sync happens in the background. |

### 4.3 Three Golden Rules for Developers

#### Rule 1: **Every Write Must Be Idempotent**

> Every mutation must have an `idempotency_key`. If the same mutation is sent twice (due to retry, network retry, or user double-tap), the server must recognize it and return the same result without creating a duplicate record.

**How to follow it:**
- Generate a UUID for each user action before mutation.
- Pass the `idempotency_key` to the server RPC function.
- The server function checks for existing records with that key before inserting.

```typescript
// GOOD: Idempotent mutation
const idempotencyKey = uuidv4();
await supabase.rpc('insert_expenditure_idempotent', {
  p_idempotency_key: idempotencyKey,
  // ... other params
});

// BAD: Non-idempotent mutation
await supabase.from('expenditures').insert({
  // No idempotency key — duplicate on retry
});
```

#### Rule 2: **Never Mutate Directly — Always Through the Sync Layer**

> Do not call Supabase directly from components or services. All mutations must go through the `SyncService` or TanStack Query mutations, which handle offline queuing, optimistic updates, and retry logic.

**How to follow it:**
- Use `injectMutation()` from TanStack Query for all writes.
- The mutation's `mutationFn` checks `syncService.isOnline()` and either dispatches immediately or enqueues to the outbox.
- Never call `supabase.from('table').insert()` directly in a component.

```typescript
// GOOD: Through TanStack Query mutation
const createMutation = injectMutation(() => ({
  mutationFn: async (dto) => {
    if (!syncService.isOnline()) {
      return localRepo.enqueueAndApply(dto);
    }
    return supabase.rpc('insert_idempotent', dto);
  },
}));

// BAD: Direct Supabase call in component
await supabase.from('expenditures').insert(dto);
```

#### Rule 3: **Financial Records Are Immutable — Use Reversal Transactions**

> Never DELETE or UPDATE a processed financial record. If a record is wrong, create a **reversal transaction** (credit note / debit note) that offsets the original. This preserves the audit trail and ensures the ledger is always reconcilable.

**How to follow it:**
- Use `soft_delete_expenditure()` instead of direct DELETE.
- For corrections, create a new transaction with a negative amount that references the original.
- The `version` column tracks revisions — it is incremented by the database trigger, never set manually.

```typescript
// GOOD: Reversal transaction
await supabase.rpc('create_reversal_transaction', {
  p_original_id: expenditureId,
  p_reversal_reason: 'Incorrect amount entered',
});

// BAD: Direct update of financial record
await supabase
  .from('expenditures')
  .update({ amount: correctedAmount })
  .eq('id', expenditureId);
```

---

## Appendix: Dependency Installation Summary

```bash
# Core dependencies
pnpm add @tanstack/angular-query-experimental
pnpm add idb
pnpm add uuid
pnpm add @capacitor/network

# Dev dependencies
pnpm add -D @tanstack/angular-query-devtools-experimental
pnpm add -D @types/uuid

# Capacitor plugins
npx cap sync
```

## Appendix: File Structure

```
src/app/core/services/sync/
├── local-db.ts              # IndexedDB schema and initialization
├── local-repository.ts      # Repository pattern for local data access
├── sync-service.ts          # Network listener + outbox processor
├── sync-orchestrator.ts     # Bidirectional sync algorithm
├── conflict-resolver.ts     # Business-rule conflict resolution
└── index.ts                 # Barrel export

src/app/core/providers/
└── query.provider.ts        # TanStack Query configuration

src/app/core/services/
├── expenditure.service.ts   # Example: TanStack Query + offline service
├── account-tree.service.ts  # Hierarchical chart of accounts offline
└── ...
```
