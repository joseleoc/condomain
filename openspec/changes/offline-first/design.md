# Design: Offline-First Infrastructure

## Technical Approach

Architecture follows the proposal's 3-phase plan: backend (migrations + RPCs) → client infra (IndexedDB, TanStack Query, sync layer) → service refactoring + network indicator. The architecture doc's recommendation of **TanStack Query + idb + custom SyncService** is adopted as the technical backbone.

## Architecture Decisions

| Decision | Choice | Tradeoff / Rationale |
|---|---|---|
| Local DB | IndexedDB via `idb` (not Capacitor SQLite) | No native plugin dependency; data volume fits comfortably in IndexedDB's 50MB+ quota. SQLite would add plugin complexity without benefit for accounting data. |
| Server-state | TanStack Query (not RxDB, not WatermelonDB) | Industry-standard Angular integration; existing team knows RxJS/Signals; provides cache persistence, retry, optimistic updates built-in. |
| Sync protocol | Custom Outbox Pattern + Delta RPCs (not PowerSync, not Realtime) | Full control over conflict resolution (critical for accounting); no vendor lock-in; Supabase Realtime excluded from scope. |
| Conflict strategy | Server-wins for financial records | Server is authoritative for accounting integrity. LWW is unacceptable for financial data. Conflicts are audit-logged. |

## Data Flow

```
User Action ──► TanStack Query Mutation
                  │
         ┌───────┴────────┐
     offline?          online?
         │                 │
    LocalRepository    Supabase RPC
    .upsert(idb)       (idempotent)
         │                 │
    SyncService        QueryClient
    .enqueue(outbox)   .invalidateQueries
         │                 │
    ┌────┴────┐       LocalRepository
    │ IDB     │       .upsert(idb)
    │ outbox  │
    └─────────┘
         │
    On reconnect ──► SyncService.processOutbox (FIFO + backoff)
                         │
                    Supabase RPC (idempotent × N remaining)
                         │
                    SyncOrchestrator.sync (delta fetch)
                         │
                    ConflictResolver (server-wins)
                         │
                    LocalRepository.upsert (sync state)
                         │
                    QueryClient.invalidateQueries
```

## File Changes

### Phase 1: Backend (`supabase/migrations/`)

| File | Action | Description |
|---|---|---|
| `supabase/migrations/{ts}_sync_columns.sql` | Create | ADD `updated_at`, `version`, `created_by`, `idempotency_key`, `deleted_at` to sync tables |
| `supabase/migrations/{ts}_version_trigger.sql` | Create | `increment_version_on_update()` trigger for all sync tables |
| `supabase/migrations/{ts}_sync_functions.sql` | Create | RPCs: `insert_*_idempotent`, `get_*_delta`, `soft_delete_*` per table |

### Phase 2: Client Infra (`src/app/core/`)

| File | Action | Description |
|---|---|---|
| `services/sync/local-db.ts` | Create | `openDB` call with `LocalDBSchema`: entity stores (expenditures, incomes, accounts), outbox (auto-increment), sync_state, query_cache. Also exposes `getLocalDB()` singleton. |
| `services/sync/local-repository.ts` | Create | `LocalRepository` — CRUD wrappers per entity store, outbox enqueue/delete/retry-update, sync-state get/set, cache read/write. |
| `services/sync/sync-service.ts` | Create | `SyncService` — `@capacitor/network` listener, `isOnline()`, `enqueueMutation()`, `processOutbox()` with exponential backoff (2^n × 1000ms, max 5), FIFO dispatch, query invalidation after success. |
| `services/sync/sync-orchestrator.ts` | Create | `SyncOrchestrator` — `sync(entityType, condoId)`: fetch delta RPC → detect conflicts (`local.version !== server.version`) → resolve via `ConflictResolver` → apply to IDB → update `last_sync_at` → invalidate queries → return `{ synced, conflicts }`. |
| `services/sync/conflict-resolver.ts` | Create | `ConflictResolver` — `resolve()`: server-wins for financial records; logs `ConflictRecord`; flags unexpected states as `manual_required`; `getConflictLog()` returns immutable copy. |
| `services/sync/index.ts` | Create | Barrel export for sync module. |
| `providers/query.provider.ts` | Create | `provideQuery()` — creates `QueryClient` with `staleTime: 5min`, `retry: 3` (backoff capped at 30s), `refetchOnWindowFocus: () => navigator.onLine`, custom IDB persister using `persistQueryClient`. Registers `@tanstack/angular-query-experimental`. |

### Phase 3: Service Migration (`src/app/core/services/`)

| File | Action | Description |
|---|---|---|
| `services/expenditure.service.ts` | Create | `ExpenditureService` — `getExpenditures()` query (online→Supabase, offline→IDB), `createExpenditure()` mutation with optimistic `onMutate` + outbox fallback |
| `services/account-tree.service.ts` | Create | `AccountTreeService` — `getAccountTree()` query (online→Supabase, offline→IDB), `#buildTree()` O(n) Map-based, children sorted by code |
| `services/network-status.service.ts` | Create | `NetworkStatusService` — injectable `Signal<boolean>`; Capacitor native events, `navigator.onLine` web fallback; root-provided singleton |
| `services/condominium/condominium.ts` | Modify | Refactor `fetchUserCondominiums` to use TanStack Query + offline cache (done in Phase 3, NOT breaking change) |
| `main.ts` | Modify | Add `provideQuery()` to `bootstrapApplication` providers |

## IndexedDB Schema

| Store | KeyPath | Indexes | Purpose |
|---|---|---|---|
| `expenditures` | `id` (UUID) | `by_condominium`, `by_updated_at`, `by_status` | Cached entity + `_local_status` (`synced|pending|conflict`) |
| `incomes` | `id` (UUID) | `by_condominium`, `by_updated_at`, `by_status` | Same pattern as expenditures |
| `accounts` | `id` (UUID) | `by_condominium`, `by_code` | Chart of accounts cache |
| `outbox` | `id` (auto-inc) | `by_created_at` | FIFO mutation queue: `mutation_type`, `entity_type`, `entity_id`, `payload`, `idempotency_key`, `retry_count`, `max_retries`, `last_error` |
| `sync_state` | `key` (string) | — | `last_sync_at` per `entity_type:condominium_id` |
| `query_cache` | `key` (string) | — | Serialized `QueryClient` cache for page-reload persistence |

## Supabase Migration Design

Sync tables identified: `expenditures`, `incomes`, `accounts`, `condominiums`, `properties`, `structures`, `profile_condominiums`.

**Migration 1**: ADD columns (`version BIGINT DEFAULT 1`, `updated_at`, `idempotency_key UUID`, `created_by UUID`, `deleted_at`) to all 7 tables. Use `IF NOT EXISTS`. Add `idx_*_updated_at` and `idx_*_idempotency_key` indexes.

**Migration 2**: CREATE `increment_version_on_update()` trigger → apply to all 7 tables (`BEFORE UPDATE ... FOR EACH ROW`).

**Migration 3**: CREATE RPCs per table: `insert_<entity>_idempotent` (checks `idempotency_key`, returns existing on duplicate), `get_<entity>_delta(p_condominium_id, p_since)` (returns rows + `operation` column), `soft_delete_<entity>(p_id)`. All `SECURITY DEFINER`.

Priority order: expenditures, incomes, accounts first (financial). Others in Phase 3.

## TanStack Query Architecture

**Provider**: `provideQuery()` injected in `main.ts` via `bootstrapApplication` providers. `QueryClient` config: `staleTime: 5min`, `retry: 3` with `retryDelay: attemptIndex => Math.min(2^attemptIndex * 1000, 30000)`, `refetchOnWindowFocus: only when online`.

**Persistence**: Custom `createSyncStoragePersister` adapter writing serialized client to `query_cache` IDB store. Restores on app init.

**Pattern for services**: `injectQuery()` for reads (offline: `LocalRepository.get*`, online: `supabase.from().select()`). `injectMutation()` for writes (offline: `LocalRepository.upsert` + `SyncService.enqueue`, online: `supabase.rpc('insert_*_idempotent')`). Optimistic updates via `onMutate`/`onError`/`onSuccess`.

## Sync Algorithm

1. **Network restore detected** → `SyncService` reads outbox (FIFO by `created_at`)
2. **For each mutation**: dispatch via `#dispatchMutation()` (switch on `entity_type` → call idempotent RPC)
3. **On success**: delete from outbox → invalidate queries for that `entity_type`
4. **On failure**: increment `retry_count` → exponential backoff → if `retry_count >= max_retries`, remove from queue (dead letter)
5. **After outbox clears**: `SyncOrchestrator.sync()` for each entity type
6. **Delta fetch**: `get_<entity>_delta(p_since => last_sync_at || '1970-01-01')`
7. **Conflict detection**: for each server row, compare `version` with local. If mismatch → `ConflictResolver.resolve()`. Server-wins for financials.
8. **Apply**: upsert winner to IDB with `_local_status = 'synced'`
9. **Finalize**: update `last_sync_at`, invalidate queries

## Service Migration Strategy

**Phase 3 only.** No existing service is touched in Phases 1-2. Migration path:

1. **Non-breaking**: Services co-exist. Old `Condominium` uses direct `supabase.from()` calls; new `ExpenditureService` uses TanStack Query. Both work side-by-side.
2. **Gradual refactor**: Each existing service gets a TanStack Query wrapper added without removing direct calls. Queries route through `QueryClient`; mutations add offline fallback.
3. **Existing tests must pass at every step.** Add new tests first (TDD), then refactor.

Migration order: `ExpenditureService` (new) → `AccountTreeService` (new) → `Condominium.fetchUserCondominiums` (modified) → `Profile` (modified) → `Structures`/`Properties` (modified).

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| **Unit — IDB init** | `getLocalDB()` creates stores, upgrades schema | Jasmine: mock `indexedDB` via `fake-indexeddb` devDependency or Karma with real IndexedDB |
| **Unit — LocalRepository** | CRUD per store, outbox FIFO, sync state | Jasmine + Karma: instantiate service, test each method against real/fake IDB |
| **Unit — ConflictResolver** | Server-wins, version mismatch detection, log immutability | Pure unit: no external deps, test all scenarios from spec |
| **Unit — AccountTreeService** | Tree construction, O(n), sorting | Pure unit: mock IDB fetch, verify tree structure |
| **Unit — NetworkStatusService** | Signal updates on events, web fallback | Mock `@capacitor/network`, fire `online`/`offline` events on `window` |
| **Integration — SyncService** | Outbox dispatch, backoff timing, invalidation | Jasmine fake timers: `jasmine.clock().install()`, mock Supabase RPC, simulate offline→online |
| **Integration — SyncOrchestrator** | Delta fetch, conflict detection, local apply | Mock `supabase.rpc` return, verify IDB state after sync |
| **Integration — Query provider** | Cache persist/restore across reload | Karma: write cache, destroy + recreate QueryClient, verify restored |
| **Unit — ExpenditureService** | Online/offline paths, optimistic update, rollback | Mock `Supabase`, `SyncService`, `LocalRepository`; test mutation lifecycle |

Coverage target: 80%+ for all sync services, 70%+ for query-integrated services.
