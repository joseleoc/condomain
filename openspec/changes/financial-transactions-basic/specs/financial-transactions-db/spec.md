# Financial Transactions — Database Schema Specification

## Purpose

Defines the `financial_transactions` table, indexes, RLS policies, soft-delete RPC, terminal-state protection, and idempotent sync functions. This is the persistence layer for income, expense, and transfer transactions.

## Requirements

### Requirement: Table Structure — `financial_transactions`

The system SHALL create table `financial_transactions`:

| Column | Type | Constraint |
|--------|------|-----------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `condominium_id` | `uuid` | NOT NULL, FK→`condominiums(id)` CASCADE |
| `account_id` | `uuid` | NOT NULL, FK→`condominium_accounts(id)` |
| `category_id` | `uuid` | NULLABLE, FK→`transaction_categories(id)` |
| `transaction_type` | `text` | NOT NULL, IN (`income`, `expense`, `transfer`) |
| `status` | `text` | NOT NULL, DEFAULT `pending`, IN (`pending`, `completed`, `voided`) |
| `amount` | `numeric(15,2)` | NOT NULL, CHECK > 0 |
| `original_currency` | `varchar(3)` | NOT NULL, FK→`currencies(iso_code)` |
| `exchange_rate` | `numeric(12,6)` | NOT NULL, DEFAULT 1.0, CHECK > 0 |
| `base_amount` | `numeric(15,2)` | NOT NULL, computed as `amount * exchange_rate` |
| `description` | `text` | NULLABLE |
| `reference` | `text` | NULLABLE |
| `transaction_date` | `date` | NOT NULL, DEFAULT `CURRENT_DATE` |
| `transfer_group_id` | `uuid` | NULLABLE — links two transfer legs |
| `version` | `bigint` | NOT NULL, DEFAULT 1 |
| `created_by` | `uuid` | DEFAULT `auth.uid()` |
| `idempotency_key` | `uuid` | NOT NULL, `gen_random_uuid()` |
| `created_at` | `timestamptz` | NOT NULL, auto-trigger |
| `updated_at` | `timestamptz` | NOT NULL, auto-trigger |
| `deleted_at` | `timestamptz` | NULLABLE |

Constraints:
- `amount` MUST be > 0.
- `exchange_rate` MUST be > 0.
- `category_id` is NULLABLE — transfers do not require a category.
- `transfer_group_id` is NULLABLE — only populated for transfer-type transactions.
- `base_amount` MUST equal `amount * exchange_rate` (enforced by service; stored denormalized for query performance).

#### Scenario: Income with same currency
- GIVEN `original_currency = 'USD'`, `exchange_rate = 1.0`, `amount = 100.00`
- WHEN row inserted
- THEN `base_amount = 100.00`

#### Scenario: Expense with foreign currency
- GIVEN `original_currency = 'EUR'`, `exchange_rate = 1.08`, `amount = 50.00`
- WHEN row inserted
- THEN `base_amount = 54.00`

#### Scenario: Transfer without category
- GIVEN `transaction_type = 'transfer'`, `category_id = NULL`
- WHEN row inserted
- THEN insert succeeds (category not required for transfers)

#### Scenario: Negative amount rejected
- GIVEN `amount = -10.00`
- WHEN insert attempted
- THEN CHECK constraint violation

---

### Requirement: Indexes

The system SHALL create the following indexes:

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| `idx_ft_condo_date` | `(condominium_id, transaction_date DESC)` | B-tree | List page default sort |
| `idx_ft_account` | `(account_id)` | B-tree | Filter by wallet |
| `idx_ft_status` | `(status)` | B-tree | Filter by status |
| `idx_ft_transfer_group` | `(transfer_group_id)` | B-tree | Lookup transfer pairs |
| `idx_ft_category` | `(category_id)` | B-tree | Filter by category |

Partial index: `(condominium_id, transaction_date DESC) WHERE deleted_at IS NULL` for active-only queries.

#### Scenario: List page query uses index
- GIVEN 1000 transactions for condo X
- WHEN `SELECT ... WHERE condominium_id = X AND deleted_at IS NULL ORDER BY transaction_date DESC LIMIT 50`
- THEN `idx_ft_condo_date` is used (verified via `EXPLAIN`)

---

### Requirement: Row Level Security

RLS SHALL be enabled on `financial_transactions`. Policies mirror Phase 1 pattern:

| Policy | For | Using | With Check |
|--------|-----|-------|------------|
| Members view own condo transactions | SELECT | `deleted_at IS NULL AND member of condominium` | — |
| Admin/operator manage transactions | ALL (INSERT/UPDATE/DELETE) | `deleted_at IS NULL AND admin/operator role` | `admin/operator role` |

#### Scenario: Member reads transactions
- GIVEN user is member of condo X (any role)
- WHEN SELECT on `financial_transactions`
- THEN returns non-deleted rows for condo X

#### Scenario: Non-member sees nothing
- GIVEN user is NOT member of condo Y
- WHEN SELECT on `financial_transactions`
- THEN zero rows returned

#### Scenario: Admin creates transaction
- GIVEN user is `condominium_admin` of condo X
- WHEN INSERT into `financial_transactions`
- THEN succeeds

#### Scenario: Owner cannot create
- GIVEN user is `owner` role only
- WHEN INSERT attempted
- THEN RLS blocks

---

### Requirement: Soft Delete RPC

Function `soft_delete_financial_transaction(p_id uuid, p_reversal_reason text)` SHALL:
1. Verify row exists and `deleted_at IS NULL`.
2. Verify caller has admin/operator role.
3. Set `deleted_at = now()`, `updated_at = now()`.
4. Raise exception if not found or insufficient permissions.

Sync entity type: `'financial_transaction'`.

#### Scenario: Soft delete marks deleted_at
- GIVEN transaction with `id = 'abc'`, `deleted_at IS NULL`
- WHEN `soft_delete_financial_transaction('abc', 'User deleted')` called
- THEN `deleted_at` set, row excluded from active queries

#### Scenario: Double soft-delete rejected
- GIVEN transaction already has `deleted_at` set
- WHEN soft delete called again
- THEN exception raised

---

### Requirement: Terminal State Protection

A BEFORE UPDATE trigger SHALL reject modifications to rows where `status IN ('completed', 'voided')`. Only the `status` column transition itself and `deleted_at` updates are exempt.

Function `guard_terminal_transaction_status()`:
- If `OLD.status IN ('completed', 'voided')` AND `NEW.status = OLD.status` AND only non-status columns changed → raise exception.
- Exception: `deleted_at` changes (soft delete) are always allowed.

#### Scenario: Edit completed transaction blocked
- GIVEN transaction with `status = 'completed'`
- WHEN UPDATE attempts to change `description`
- THEN exception raised "Cannot modify terminal transaction"

#### Scenario: Status transition allowed
- GIVEN `status = 'pending'`
- WHEN UPDATE sets `status = 'completed'`
- THEN succeeds

#### Scenario: Soft delete on completed allowed
- GIVEN `status = 'completed'`
- WHEN UPDATE sets `deleted_at = now()`
- THEN succeeds (audit trail preserved)

---

### Requirement: Status Transition Validation

A CHECK constraint or trigger SHALL enforce valid transitions:
- `pending` → `completed` ✓
- `pending` → `voided` ✓
- `completed` → `voided` ✓
- All other transitions ✗

Function `validate_status_transition()`:
- BEFORE UPDATE, if `NEW.status != OLD.status`, validate against allowed map.

#### Scenario: Pending to completed
- GIVEN `status = 'pending'`
- WHEN UPDATE sets `status = 'completed'`
- THEN succeeds

#### Scenario: Voided to pending rejected
- GIVEN `status = 'voided'`
- WHEN UPDATE sets `status = 'pending'`
- THEN exception raised

#### Scenario: Completed to pending rejected
- GIVEN `status = 'completed'`
- WHEN UPDATE sets `status = 'pending'`
- THEN exception raised

---

### Requirement: Idempotent Sync RPCs

Three RPC functions for offline sync:

| Function | Behavior |
|----------|----------|
| `insert_financial_transaction_idempotent` | INSERT with `ON CONFLICT (idempotency_key) DO NOTHING`, return existing or new row |
| `update_financial_transaction_idempotent` | UPDATE where `idempotency_key` matches, respecting terminal guard |
| `soft_delete_financial_transaction` | Already covered above |

All functions use `security definer`, `set search_path = public`, and verify caller permissions.

#### Scenario: Idempotent insert deduplicates
- GIVEN mutation with `idempotency_key = 'k1'` already applied
- WHEN same mutation replayed
- THEN returns existing row, no duplicate created

#### Scenario: Idempotent update applies once
- GIVEN transaction updated via sync
- WHEN same update replayed
- THEN no error, row unchanged

---

### Requirement: Grants

```sql
grant select, insert, update, delete on financial_transactions to authenticated;
grant select on financial_transactions to anon;
grant all on financial_transactions to service_role;
grant execute on all RPC functions to authenticated;
```

#### Scenario: Authenticated user can CRUD
- GIVEN authenticated user with proper role
- WHEN INSERT/UPDATE/DELETE/SELECT
- THEN permitted by RLS + grants
