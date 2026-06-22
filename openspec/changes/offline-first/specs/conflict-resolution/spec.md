# Conflict Resolution Specification

## Purpose

Define business-rule-driven conflict resolution for accounting data, ensuring deterministic handling of simultaneous edits with full audit logging.

## Requirements

### Requirement: Server-Wins for Financial Records

When a conflict is detected between local and server versions of a financial record (expenditure, income), the server version MUST be authoritative.

#### Scenario: Server version is newer

- GIVEN local expenditure has `version = 3` and server has `version = 5`
- WHEN `resolve()` is called
- THEN the server data is returned as the winner with `resolution = 'server_wins'`

#### Scenario: Conflict is logged

- GIVEN a conflict is resolved with `server_wins`
- WHEN the resolution completes
- THEN a `ConflictRecord` is stored with entity details, both versions, and resolution type

### Requirement: Conflict Record Structure

Every conflict MUST be logged with complete audit information: entity type, entity ID, both versions, both data snapshots, resolution strategy, and timestamp.

#### Scenario: Conflict record contains all fields

- WHEN a conflict is resolved
- THEN the `ConflictRecord` has `entity_type`, `entity_id`, `local_version`, `server_version`, `local_data`, `server_data`, `resolution`, and `resolved_at`

### Requirement: Manual Conflict Flagging

When the local version is equal to or newer than the server version (unexpected state), the conflict MUST be flagged as `manual_required` and default to server data for safety.

#### Scenario: Local version equals server version

- GIVEN local `version = 5` and server `version = 5`
- WHEN `resolve()` is called
- THEN `resolution = 'manual_required'` and the server data is returned as the default winner

#### Scenario: Local version is newer than server

- GIVEN local `version = 6` and server `version = 5`
- WHEN `resolve()` is called
- THEN `resolution = 'manual_required'` (unexpected state — local should not be ahead after outbox dispatch)

### Requirement: Conflict Log Retrieval

The `ConflictResolver` MUST expose the full conflict log for inspection and debugging.

#### Scenario: All conflicts are retrievable

- GIVEN 3 conflicts have been resolved
- WHEN `getConflictLog()` is called
- THEN an array of 3 `ConflictRecord` objects is returned

#### Scenario: Returned log is a copy (immutable)

- WHEN `getConflictLog()` returns an array
- THEN modifying the returned array does not affect the internal log

### Requirement: Non-Financial Entity Conflicts

For non-financial entities (e.g., condominium metadata, user profile), the conflict resolution strategy MAY differ from server-wins.

#### Scenario: Condominium metadata uses server-wins

- GIVEN a conflict on condominium name (not financial)
- WHEN resolved
- THEN server wins (admin changes are authoritative)

### Requirement: Conflict Detection via Version Mismatch

A conflict is detected when the same entity exists both locally and on the server with different `version` numbers during the sync cycle.

#### Scenario: Version mismatch triggers conflict

- GIVEN a local row with `version = 3` and a server delta row with `version = 5` for the same entity ID
- WHEN the sync orchestrator compares them
- THEN `ConflictResolver.resolve()` is called

#### Scenario: Same version is not a conflict

- GIVEN a local row with `version = 3` and a server delta row with `version = 3`
- WHEN the sync orchestrator compares them
- THEN no conflict is raised; the server row is applied normally

## Acceptance Criteria

- [ ] Financial conflicts always resolve to server-wins
- [ ] Conflict records contain complete audit information
- [ ] Unexpected version states flag as manual_required
- [ ] Conflict log is retrievable and immutable
- [ ] Version-matched rows do not trigger conflicts
- [ ] ConflictResolver is covered by unit tests (80%+)
