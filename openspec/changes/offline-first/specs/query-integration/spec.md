# Query Integration Specification

## Purpose

Define the TanStack Query (Angular Query) provider configuration, IndexedDB persistence layer, and query/mutation patterns for offline-aware services.

## Requirements

### Requirement: Query Provider Configuration

The application MUST provide a configured `QueryClient` with offline-aware defaults for stale time, retry behavior, and window focus refetching.

#### Scenario: Provider is available via DI

- WHEN `provideQuery()` is called in app config
- THEN `QueryClient` is injectable throughout the application

#### Scenario: Default stale time is 5 minutes

- GIVEN a query is executed
- WHEN the same query is requested within 5 minutes
- THEN cached data is returned without a network request

#### Scenario: Retry with exponential backoff

- GIVEN a query fails
- WHEN retry logic executes
- THEN it retries up to 3 times with delays of 1s, 2s, 4s (capped at 30s)

#### Scenario: No refetch on window focus when offline

- GIVEN the device is offline (`navigator.onLine === false`)
- WHEN the window gains focus
- THEN queries are NOT refetched

### Requirement: IndexedDB Persistence for Query Cache

The QueryClient cache MUST persist to IndexedDB so that cached data survives page reloads.

#### Scenario: Cache is saved to IndexedDB

- WHEN a query completes and returns data
- THEN the cache is persisted via the IndexedDB persister

#### Scenario: Cache is restored on page reload

- GIVEN the cache was persisted before a page reload
- WHEN the app loads again
- THEN the previous cache data is restored from IndexedDB

### Requirement: Offline Query Pattern

Services MUST check network status before executing queries and fall back to local IndexedDB when offline.

#### Scenario: Online query fetches from server

- GIVEN the device is online
- WHEN a query function executes
- THEN data is fetched from Supabase and cached locally

#### Scenario: Offline query reads from local DB

- GIVEN the device is offline
- WHEN a query function executes
- THEN data is read from `LocalRepository.getEntitiesByType()`

### Requirement: Mutation with Optimistic Updates

Mutations MUST apply optimistically to the cache, with rollback on error.

#### Scenario: Optimistic add to cache

- WHEN a create mutation is called
- THEN the new entity is immediately added to the query cache via `onMutate`

#### Scenario: Rollback on mutation error

- GIVEN an optimistic entity was added to the cache
- WHEN the mutation fails
- THEN `onError` restores the previous cache state from the snapshot

### Requirement: Mutation Offline Path

When offline, mutations MUST apply locally and enqueue to the outbox instead of dispatching to the server.

#### Scenario: Offline mutation applies locally

- GIVEN the device is offline
- WHEN a create mutation is called
- THEN the entity is upserted to local IndexedDB with `_local_status = 'pending'`

#### Scenario: Offline mutation enqueues to outbox

- GIVEN the device is offline
- WHEN a create mutation is called
- THEN `syncService.enqueueMutation()` is called with the mutation payload

### Requirement: Mutation Online Path

When online, mutations MUST dispatch to the server via idempotent RPC functions (when available).

#### Scenario: Online mutation uses idempotent RPC

- GIVEN the device is online
- WHEN a create mutation is called
- THEN `supabase.rpc('insert_{entity}_idempotent', { p_idempotency_key: ... })` is called (if the RPC exists)

#### Scenario: Idempotency key is generated per mutation

- WHEN a mutation is dispatched
- THEN a new UUID is generated as the `idempotency_key`

### Requirement: Query Invalidation on Success

After a successful mutation, affected queries MUST be invalidated to trigger a refetch.

#### Scenario: Entity queries are invalidated

- WHEN a create mutation succeeds
- THEN `queryClient.invalidateQueries({ queryKey: [entityType] })` is called

## Acceptance Criteria

- [ ] QueryClient is configured with correct defaults (staleTime, retry, refetchOnWindowFocus)
- [ ] Query cache persists to and restores from IndexedDB
- [ ] Queries read from local DB when offline
- [ ] Mutations apply optimistically with rollback on error
- [ ] Offline mutations enqueue to outbox
- [ ] Online mutations use idempotent RPCs (when available)
- [ ] Query invalidation triggers after successful mutations
