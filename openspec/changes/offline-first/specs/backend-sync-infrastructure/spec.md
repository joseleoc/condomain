# Backend Sync Infrastructure Specification

## Purpose

Define the Supabase migration artifacts (columns, triggers, indexes, RPC functions) required for offline-first sync: version tracking, idempotent inserts, delta sync, and soft deletes.

## Requirements

### Requirement: Sync Metadata Columns

Every table participating in offline sync MUST include `updated_at`, `version`, `created_by`, `idempotency_key`, and optionally `deleted_at` columns.

#### Scenario: Columns added to an existing table

- GIVEN an existing table (e.g., `expenditures`) without sync columns
- WHEN the migration runs
- THEN the table has `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `version BIGINT NOT NULL DEFAULT 1`, `created_by UUID NOT NULL DEFAULT auth.uid()`, and `idempotency_key UUID NOT NULL DEFAULT gen_random_uuid()`

#### Scenario: Soft delete column added

- GIVEN a table already has sync metadata columns
- WHEN the soft-delete migration runs
- THEN the table has `deleted_at TIMESTAMPTZ` (nullable)

### Requirement: Version Auto-Increment Trigger

A PostgreSQL trigger MUST automatically increment `version` and update `updated_at` on every UPDATE to a sync-participating table.

#### Scenario: Version increments on update

- GIVEN a row with `version = 1`
- WHEN any column is updated
- THEN `version` becomes `2` and `updated_at` is set to `NOW()`

#### Scenario: Version does not change on insert

- GIVEN a new row is inserted
- WHEN the insert completes
- THEN `version` is `1` (default) and the trigger does not fire

### Requirement: Idempotent Insert RPC

An RPC function MUST prevent duplicate inserts when the same mutation is retried, using `idempotency_key` as the deduplication key.

#### Scenario: First insert creates the row

- GIVEN no row exists with `idempotency_key = 'X'`
- WHEN `insert_expenditure_idempotent(p_idempotency_key => 'X', ...)` is called
- THEN a new row is inserted and returned

#### Scenario: Duplicate insert returns existing row

- GIVEN a row already exists with `idempotency_key = 'X'`
- WHEN `insert_expenditure_idempotent(p_idempotency_key => 'X', ...)` is called again
- THEN the existing row is returned without creating a duplicate

### Requirement: Delta Sync RPC

An RPC function MUST return all rows changed since a given timestamp for a specific condominium, including the operation type (INSERT, UPDATE, DELETE).

#### Scenario: Returns rows modified since timestamp

- GIVEN rows were updated at times T1, T2, T3 where T1 < T2 < T3
- WHEN `get_expenditures_delta(p_since => T2)` is called
- THEN rows with `updated_at > T2` are returned (T3 only), ordered by `updated_at ASC`

#### Scenario: Operation type is correct

- GIVEN a row with `version = 1` and `deleted_at IS NULL`
- WHEN the delta RPC returns it
- THEN `operation = 'INSERT'`

- GIVEN a row with `version > 1` and `deleted_at IS NULL`
- WHEN the delta RPC returns it
- THEN `operation = 'UPDATE'`

- GIVEN a row with `deleted_at IS NOT NULL`
- WHEN the delta RPC returns it
- THEN `operation = 'DELETE'`

### Requirement: Soft Delete RPC

An RPC function MUST mark a row as deleted (set `deleted_at`) instead of physically removing it, preserving the audit trail.

#### Scenario: Soft delete marks the row

- GIVEN a row with `deleted_at IS NULL`
- WHEN `soft_delete_expenditure(p_id, p_reversal_reason)` is called
- THEN `deleted_at` is set to `NOW()` and `version` increments

#### Scenario: Double soft delete is idempotent

- GIVEN a row with `deleted_at IS NOT NULL`
- WHEN `soft_delete_expenditure` is called again
- THEN no rows are affected (WHERE clause excludes already-deleted rows)

### Requirement: Delta Sync Indexes

Indexes MUST exist on `updated_at` and `idempotency_key` columns for efficient delta queries and idempotency lookups.

#### Scenario: Indexes support delta queries

- GIVEN the `idx_expenditures_updated_at` index exists on `(updated_at DESC)`
- WHEN a delta query filters by `updated_at > T`
- THEN the query uses the index (verified via EXPLAIN)

## Acceptance Criteria

- [ ] Migration runs without error on a fresh Supabase instance
- [ ] `insert_expenditure_idempotent` returns the same row on duplicate calls
- [ ] `get_expenditures_delta` returns correct rows with correct operation types
- [ ] `soft_delete_expenditure` sets `deleted_at` and increments `version`
- [ ] Trigger auto-increments `version` on every UPDATE
- [ ] Indexes exist and are used in query plans
