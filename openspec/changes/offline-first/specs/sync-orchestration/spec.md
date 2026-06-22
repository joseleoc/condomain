# Sync Orchestration Specification

## Purpose

Define the `SyncService` and `SyncOrchestrator` that manage network awareness, outbox dispatch with retry/backoff, and bidirectional delta sync.

## Requirements

### Requirement: Network Status Detection

The `SyncService` MUST detect online/offline state using `@capacitor/network` on native platforms and `navigator.onLine` as fallback for web.

#### Scenario: Initial status is detected on construction

- GIVEN the device is connected to the internet
- WHEN `SyncService` is instantiated
- THEN `isOnline()` returns `true`

#### Scenario: Status changes on network event

- GIVEN the service is online
- WHEN the network disconnects
- THEN `isOnline()` returns `false`

### Requirement: Outbox Processing on Reconnect

The `SyncService` MUST automatically process the outbox queue when transitioning from offline to online.

#### Scenario: Outbox dispatches on reconnect

- GIVEN 3 mutations are pending in the outbox
- AND the device was offline and becomes online
- WHEN the network status change event fires
- THEN all 3 pending mutations are dispatched in FIFO order

#### Scenario: No dispatch when already online

- GIVEN the device is already online
- WHEN the app starts
- THEN the outbox is processed once on initialization

### Requirement: FIFO Dispatch Order

Mutations MUST be dispatched in chronological order (oldest first) to preserve causal ordering.

#### Scenario: Oldest mutation is dispatched first

- GIVEN mutations A (T1), B (T2), C (T3) where T1 < T2 < T3
- WHEN the outbox is processed
- THEN A is dispatched before B, and B before C

### Requirement: Retry with Exponential Backoff

Failed mutations MUST be retried with exponential backoff (2^attempt × 1000ms), up to a configurable maximum.

#### Scenario: First retry waits 1 second

- GIVEN a mutation fails on first dispatch (`retry_count = 0`)
- WHEN the retry logic executes
- THEN the next attempt waits approximately 1000ms (2^0 × 1000)

#### Scenario: Third retry waits 4 seconds

- GIVEN a mutation has failed twice (`retry_count = 2`)
- WHEN the retry logic executes
- THEN the next attempt waits approximately 4000ms (2^2 × 1000)

#### Scenario: Max retries exceeded removes mutation

- GIVEN a mutation has `retry_count >= max_retries` (default 5)
- WHEN the outbox processor reaches it
- THEN the mutation is deleted from the outbox without further dispatch attempts

### Requirement: Query Invalidation on Success

After a mutation is successfully dispatched to the server, affected TanStack Query caches MUST be invalidated.

#### Scenario: Queries are invalidated after successful dispatch

- GIVEN an expenditure mutation was successfully dispatched
- WHEN the dispatch completes
- THEN `queryClient.invalidateQueries({ queryKey: ['expenditure'] })` is called

### Requirement: Delta Fetch from Server

The `SyncOrchestrator` MUST fetch server-side delta changes since the last sync timestamp for a given entity-condominium pair.

#### Scenario: Fetches delta since last sync

- GIVEN last sync was at `2026-06-20T10:00:00Z` for `expenditures:abc-123`
- WHEN `sync('expenditure', 'abc-123')` is called
- THEN the RPC `get_expenditures_delta(p_since => '2026-06-20T10:00:00Z')` is called

#### Scenario: First sync fetches all history

- GIVEN no previous sync exists for the key
- WHEN `sync` is called
- THEN `p_since` defaults to `'1970-01-01T00:00:00Z'` (fetches everything)

### Requirement: Server Changes Applied Locally

Delta results from the server MUST be upserted into the local IndexedDB store.

#### Scenario: New server rows are inserted locally

- GIVEN the server delta returns a row that does not exist locally
- WHEN the sync orchestrator processes it
- THEN the row is inserted into the local store with `_local_status = 'synced'`

#### Scenario: Existing server rows are updated locally

- GIVEN the server delta returns a row that exists locally with an older version
- WHEN the sync orchestrator processes it
- THEN the local row is updated with the server data

### Requirement: Sync Timestamp Update

After a successful sync cycle, the `last_sync_at` timestamp MUST be updated.

#### Scenario: Timestamp is updated after sync

- GIVEN sync completed successfully for `expenditures:abc-123`
- WHEN the sync cycle ends
- THEN `setLastSyncAt('expenditures:abc-123', <current timestamp>)` is called

### Requirement: Sync Returns Summary

The sync operation MUST return a summary of records synced and conflicts detected.

#### Scenario: Summary includes counts

- GIVEN the server returned 10 delta rows and 2 conflicts were resolved
- WHEN `sync` completes
- THEN it returns `{ synced: 10, conflicts: 2 }`

## Acceptance Criteria

- [ ] Network status is correctly detected on native and web
- [ ] Outbox dispatches automatically on reconnect
- [ ] Mutations are dispatched in FIFO order
- [ ] Exponential backoff delays are correct (1s, 2s, 4s, 8s, 16s)
- [ ] Max-retry-exceeded mutations are removed from outbox
- [ ] Query cache is invalidated after successful dispatch
- [ ] Delta fetch uses correct `p_since` timestamp
- [ ] Sync summary returns accurate counts
