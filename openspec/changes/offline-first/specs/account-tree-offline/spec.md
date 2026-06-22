# Account Tree Offline Specification

## Purpose

Define the `AccountTreeService` that builds a hierarchical chart of accounts from local IndexedDB, enabling full offline navigation of the accounting structure.

## Requirements

### Requirement: Offline Account Tree Query

The service MUST provide a TanStack Query that fetches accounts and builds a hierarchical tree, working both online and offline.

#### Scenario: Online fetches from Supabase

- GIVEN the device is online
- WHEN `getAccountTree(condominiumId)` is called
- THEN accounts are fetched from Supabase ordered by `code`

#### Scenario: Offline reads from local DB

- GIVEN the device is offline
- WHEN `getAccountTree(condominiumId)` is called
- THEN accounts are read from `LocalRepository.getAccountsByCondominium()`

### Requirement: Hierarchical Tree Construction

The service MUST build a tree structure from a flat list of accounts using parent-child relationships.

#### Scenario: Root accounts have no parent

- GIVEN accounts with `parent_id = null`
- WHEN `#buildTree()` is called
- THEN those accounts appear as root nodes in the tree

#### Scenario: Child accounts are nested under parents

- GIVEN account A has `parent_id = accountB.id`
- WHEN `#buildTree()` is called
- THEN account A appears in `accountB.children`

#### Scenario: Tree construction is O(n)

- GIVEN N accounts in the flat list
- WHEN `#buildTree()` is called
- THEN the algorithm uses a Map for O(n) construction (not nested loops)

### Requirement: Children Sorted by Code

Child accounts within each node MUST be sorted alphabetically by their `code` field.

#### Scenario: Children are sorted by code

- GIVEN a parent has children with codes `['1.2', '1.1', '1.3']`
- WHEN the tree is built
- THEN children are ordered `['1.1', '1.2', '1.3']`

#### Scenario: Sorting is recursive

- GIVEN nested children at multiple levels
- WHEN the tree is built
- THEN children at every level are sorted by code

### Requirement: Account Node Structure

Each tree node MUST include all required fields: `id`, `code`, `name`, `type`, `parent_id`, `level`, `balance`, and `children`.

#### Scenario: Node has all required fields

- WHEN an account is converted to a tree node
- THEN it has `id`, `code`, `name`, `type`, `parent_id`, `level`, `balance`, and `children: []`

#### Scenario: Default values for missing fields

- GIVEN an account record with `level` or `balance` as null
- WHEN converted to a node
- THEN `level` defaults to `0` and `balance` defaults to `0`

### Requirement: Stale Time for Accounts

Account data changes infrequently, so the query stale time MUST be longer than transaction data.

#### Scenario: Accounts cache for 30 minutes

- GIVEN accounts were fetched
- WHEN the same query is requested within 30 minutes
- THEN cached data is returned without a network request

## Acceptance Criteria

- [ ] Account tree works offline by reading from local DB
- [ ] Tree construction produces correct parent-child hierarchy
- [ ] Children are sorted by code at every level
- [ ] Tree construction is O(n) using a Map
- [ ] Node structure includes all required fields with defaults
- [ ] Stale time is 30 minutes for account queries
