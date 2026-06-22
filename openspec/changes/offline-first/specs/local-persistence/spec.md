# Local Persistence Specification

## Purpose

Define the IndexedDB schema, repository pattern, and data models that serve as the local source of truth for offline-first operations.

## Scope Note

This spec defines **generic** IndexedDB stores. Entity-specific stores (e.g., `expenditures`, `incomes`, `accounts`) will be added when those domain features are implemented. The current implementation uses a single `entities` store with `entity_type` discrimination.

## Requirements

### Requirement: IndexedDB Schema

The local database MUST define these object stores: `entities` (generic, with `entity_type` discrimination), `outbox`, `sync_state`, and `query_cache`, with appropriate indexes.

#### Scenario: Database initializes on first load

- GIVEN no IndexedDB database named `condomain-local` exists
- WHEN `getLocalDB()` is called
- THEN the database is created with version 1 and all object stores

#### Scenario: Entities store has correct indexes

- GIVEN the `entities` store is created
- THEN it has indexes `by_type`, `by_condominium`, and `by_status`

#### Scenario: Outbox store uses auto-increment keys

- GIVEN the `outbox` store is created
- THEN its key path is `id` with `autoIncrement: true`

#### Scenario: Query cache store exists

- GIVEN the `query_cache` store is created
- THEN it uses string keys for cache entries

### Requirement: Generic Entity Upsert

The repository MUST support upserting entity records in the generic `entities` store, discriminated by `entity_type`.

#### Scenario: New entity is inserted

- GIVEN no entity with `id = 'X'` and `entity_type = 'condominium'` exists
- WHEN `upsert('condominium', entity)` is called
- THEN the entity is stored with `_local_status = 'synced'`

#### Scenario: Existing entity is updated

- GIVEN an entity with `id = 'X'` and `entity_type = 'condominium'` already exists
- WHEN `upsert('condominium', updatedEntity)` is called
- THEN the existing record is replaced with the new data

### Requirement: Entity Query by Type and Condominium

The repository MUST retrieve all non-deleted entities of a specific type for a condominium.

#### Scenario: Returns only active entities of a type

- GIVEN the entities store has 5 condominiums for user A, 2 with `deleted_at IS NOT NULL`
- WHEN `getEntitiesByType('condominium', userIdA)` is called
- THEN 3 entities are returned (deleted ones filtered out)

#### Scenario: Returns empty array for unknown type

- GIVEN no entities exist with `entity_type = 'unknown'`
- WHEN `getEntitiesByType('unknown')` is called
- THEN an empty array is returned

### Requirement: Outbox Enqueue

The repository MUST enqueue mutations to the outbox store with chronological ordering.

#### Scenario: Mutation is enqueued with timestamp

- WHEN `enqueueMutation({ mutation_type: 'create', entity_type: 'condominium', ... })` is called
- THEN a new outbox entry is created with `created_at` set to the current ISO timestamp

#### Scenario: Auto-increment ID is assigned

- WHEN `enqueueMutation` is called
- THEN the returned ID is a positive integer (auto-increment)

### Requirement: Outbox Retrieval (FIFO)

The repository MUST retrieve all pending mutations ordered by creation time (FIFO).

#### Scenario: Returns mutations in chronological order

- GIVEN 3 mutations were enqueued at times T1 < T2 < T3
- WHEN `getPendingMutations()` is called
- THEN mutations are returned in order [T1, T2, T3]

### Requirement: Outbox Mutation Management

The repository MUST support deleting a mutation by ID and updating retry metadata.

#### Scenario: Mutation is deleted after successful dispatch

- GIVEN a mutation with `id = 5` exists in the outbox
- WHEN `deleteMutation(5)` is called
- THEN the mutation is removed from the store

#### Scenario: Retry count and error are updated

- GIVEN a mutation with `id = 5`, `retry_count = 0`
- WHEN `updateMutationRetry(5, 1, 'Network error')` is called
- THEN the mutation has `retry_count = 1` and `last_error = 'Network error'`

### Requirement: Sync State Tracking

The repository MUST store and retrieve the last sync timestamp per entity-condominium pair.

#### Scenario: Last sync timestamp is stored

- WHEN `setLastSyncAt('condominium:user-123', '2026-06-20T10:00:00Z')` is called
- THEN a sync_state entry with key `'condominium:user-123'` stores that timestamp

#### Scenario: Last sync timestamp is retrieved

- GIVEN a sync_state entry exists for key `'condominium:user-123'` with timestamp T
- WHEN `getLastSyncAt('condominium:user-123')` is called
- THEN T is returned

#### Scenario: Unknown key returns undefined

- WHEN `getLastSyncAt('unknown:key')` is called
- THEN `undefined` is returned

### Requirement: Local Status Field

Every entity record MUST include a `_local_status` field indicating sync state: `'synced'`, `'pending'`, or `'conflict'`.

#### Scenario: Status is set on local creation

- WHEN a new entity is created while offline
- THEN `_local_status` is `'pending'`

#### Scenario: Status is set after successful sync

- WHEN a pending entity is confirmed synced from the server
- THEN `_local_status` is updated to `'synced'`

## Acceptance Criteria

- [ ] IndexedDB initializes with all stores and indexes on first call
- [ ] Generic entity upsert correctly inserts new and updates existing records
- [ ] Query by type filters out soft-deleted records
- [ ] Outbox entries are returned in FIFO order
- [ ] Sync state persists across page reloads
- [ ] All repository methods are covered by unit tests (80%+)
