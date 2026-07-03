# Accounting Database Schema Specification

## Purpose

Defines the database schema for the double-entry accounting engine: global system accounts, per-condominium accounts, and auto-generated journal entries. Covers tables, indexes, RLS, triggers, seed data, and RPC functions.

## Requirements

### Requirement: Table Structure — `chart_of_accounts_system`

The system SHALL create table `chart_of_accounts_system` — a global, immutable catalog of accounting accounts shared across all condominiums:

| Column | Type | Constraint |
|--------|------|-----------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `account_code` | `text` | NOT NULL, UNIQUE |
| `account_name` | `text` | NOT NULL |
| `account_type` | `text` | NOT NULL, IN (`asset`, `liability`, `equity`, `income`, `expense`) |
| `normal_balance` | `text` | NOT NULL, IN (`debit`, `credit`) |
| `level` | `integer` | NOT NULL, IN (1, 2, 3) |
| `parent_id` | `uuid` | NULLABLE, FK→`chart_of_accounts_system(id)` |
| `is_active` | `boolean` | NOT NULL, DEFAULT `true` |
| `i18n_key` | `text` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |

Constraints:
- `account_code` MUST be globally unique.
- `level` MUST be 1, 2, or 3.
- `parent_id` is NULL for level-1 accounts; MUST reference a level-1 account for level-2; MUST reference a level-2 account for level-3.
- Level depth validated by trigger.

#### Scenario: Level-1 account has no parent
- GIVEN `level = 1`
- WHEN insert attempted with `parent_id IS NULL`
- THEN succeeds

#### Scenario: Level-3 account requires level-2 parent
- GIVEN `level = 3`, `parent_id` references a level-1 account
- WHEN insert attempted
- THEN trigger raises exception "Level-3 account must have a level-2 parent"

#### Scenario: Account code uniqueness
- GIVEN `account_code = '1.1.01'` already exists
- WHEN insert with same code attempted
- THEN UNIQUE constraint violation

---

### Requirement: System Account Seed Data

The migration SHALL seed exactly 30 system accounts:

**Level 1 (5 accounts):**

| Code | Name | Type | Normal Balance |
|------|------|------|----------------|
| `1` | Assets | asset | debit |
| `2` | Liabilities | liability | credit |
| `3` | Equity | equity | credit |
| `4` | Income | income | credit |
| `5` | Expenses | expense | debit |

**Level 2 (11 accounts):**

| Code | Name | Type | Normal Balance | Parent |
|------|------|------|----------------|--------|
| `1.1` | Current Assets | asset | debit | Assets |
| `1.2` | Fixed Assets | asset | debit | Assets |
| `2.1` | Current Liabilities | liability | credit | Liabilities |
| `2.2` | Long-term Liabilities | liability | credit | Liabilities |
| `3.1` | Contributed Equity | equity | credit | Equity |
| `3.2` | Retained Earnings | equity | credit | Equity |
| `4.1` | Operating Income | income | credit | Income |
| `4.2` | Other Income | income | credit | Income |
| `5.1` | Operating Expenses | expense | debit | Expenses |
| `5.2` | Administrative Expenses | expense | debit | Expenses |
| `5.3` | Maintenance Expenses | expense | debit | Expenses |

**Level 3 (14 accounts):**

| Code | Name | Type | Normal Balance | Parent |
|------|------|------|----------------|--------|
| `1.1.01` | Cash | asset | debit | Current Assets |
| `1.1.02` | Bank Accounts | asset | debit | Current Assets |
| `1.1.03` | Digital Wallets | asset | debit | Current Assets |
| `1.1.04` | Accounts Receivable | asset | debit | Current Assets |
| `1.1.05` | Reserve Fund | asset | debit | Current Assets |
| `1.2.01` | Common Areas | asset | debit | Fixed Assets |
| `1.2.02` | Equipment | asset | debit | Fixed Assets |
| `2.1.01` | Accounts Payable | liability | credit | Current Liabilities |
| `2.1.02` | Taxes Payable | liability | credit | Current Liabilities |
| `2.1.03` | Credit Cards | liability | credit | Current Liabilities |
| `4.1.01` | Monthly Fees | income | credit | Operating Income |
| `4.1.02` | Special Assessments | income | credit | Operating Income |
| `5.1.01` | Utilities | expense | debit | Operating Expenses |
| `5.1.02` | Services | expense | debit | Operating Expenses |

Seeding uses `INSERT ... ON CONFLICT (account_code) DO NOTHING` for idempotency.

#### Scenario: Idempotent seed on re-run
- GIVEN migration already applied with 30 accounts
- WHEN migration re-run
- THEN no duplicates, no errors

---

### Requirement: Table Structure — `chart_of_accounts`

The system SHALL create table `chart_of_accounts` — per-condominium accounting accounts auto-populated from the system template:

| Column | Type | Constraint |
|--------|------|-----------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `condominium_id` | `uuid` | NOT NULL, FK→`condominiums(id)` CASCADE |
| `system_account_id` | `uuid` | NULLABLE, FK→`chart_of_accounts_system(id)` |
| `account_code` | `text` | NOT NULL |
| `account_name` | `text` | NOT NULL |
| `account_type` | `text` | NOT NULL, IN (`asset`, `liability`, `equity`, `income`, `expense`) |
| `normal_balance` | `text` | NOT NULL, IN (`debit`, `credit`) |
| `level` | `integer` | NOT NULL, IN (1, 2, 3) |
| `parent_id` | `uuid` | NULLABLE, FK→`chart_of_accounts(id)` |
| `is_system` | `boolean` | NOT NULL, DEFAULT `true` |
| `is_active` | `boolean` | NOT NULL, DEFAULT `true` |
| `current_balance` | `numeric(15,2)` | NOT NULL, DEFAULT 0 |
| `i18n_key` | `text` | NULLABLE |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |
| `deleted_at` | `timestamptz` | NULLABLE |

Constraints:
- Partial unique: `(condominium_id, account_code) WHERE deleted_at IS NULL`.
- `system_account_id` is NULL for user-created custom accounts; populated for system-derived accounts.
- `is_system = true` rows cannot be deleted (RLS policy + trigger guard).

#### Scenario: Auto-populate on condo creation
- GIVEN new condominium inserted
- WHEN `seed_condominium_chart_of_accounts()` trigger fires
- THEN 30 rows inserted into `chart_of_accounts` with `is_system = true`, `parent_id` references resolved within the condo scope

#### Scenario: Custom account creation
- GIVEN admin creates account with `is_system = false`
- WHEN insert with unique `(condominium_id, account_code)`
- THEN succeeds

#### Scenario: System account delete blocked
- GIVEN `is_system = true` row
- WHEN DELETE attempted
- THEN RLS policy blocks; trigger raises exception

---

### Requirement: Auto-Populate Trigger

Function `seed_condominium_chart_of_accounts()` SHALL fire AFTER INSERT on `condominiums`:

1. For each level-1 system account: INSERT into `chart_of_accounts` with `parent_id = NULL`.
2. For each level-2 system account: INSERT with `parent_id` resolved to the condo's copy of the level-1 parent.
3. For each level-3 system account: INSERT with `parent_id` resolved to the condo's copy of the level-2 parent.
4. All inserts use `ON CONFLICT DO NOTHING` for idempotency.

#### Scenario: New condo gets 30 accounts
- GIVEN condominium "Residencial Sol" created
- WHEN trigger fires
- THEN `chart_of_accounts` has 30 rows for this condo, hierarchy intact

#### Scenario: Trigger idempotency
- GIVEN trigger fires twice (re-insert scenario)
- THEN no duplicates

---

### Requirement: Table Structure — `financial_transaction_entries`

The system SHALL create table `financial_transaction_entries` — auto-generated debit/credit journal entries:

| Column | Type | Constraint |
|--------|------|-----------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `condominium_id` | `uuid` | NOT NULL, FK→`condominiums(id)` CASCADE |
| `financial_transaction_id` | `uuid` | NOT NULL, FK→`financial_transactions(id)` RESTRICT |
| `account_id` | `uuid` | NOT NULL, FK→`chart_of_accounts(id)` RESTRICT |
| `entry_type` | `text` | NOT NULL, IN (`debit`, `credit`) |
| `amount` | `numeric(15,2)` | NOT NULL, CHECK > 0 |
| `currency` | `varchar(3)` | NOT NULL, FK→`currencies(iso_code)` |
| `exchange_rate` | `numeric(14,4)` | NOT NULL, DEFAULT 1.0 |
| `base_amount` | `numeric(15,2)` | NOT NULL |
| `description` | `text` | NULLABLE |
| `entry_status` | `text` | NOT NULL, DEFAULT `active`, IN (`active`, `voided`) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |

Constraints:
- `amount` MUST be > 0.
- `base_amount` = `amount * exchange_rate` (enforced by service).
- `entry_status` transitions: `active` → `voided` only (no reversal).
- No `deleted_at` — entries are never deleted; voided entries remain for audit trail.

#### Scenario: Income generates two entries
- GIVEN income transaction `id = 't1'`, amount 100 USD
- WHEN `AccountingEngine` processes
- THEN entry 1: Dr Bank Accounts (1.1.02) 100 USD; entry 2: Cr Operating Income (4.1.01) 100 USD

#### Scenario: Expense generates two entries
- GIVEN expense transaction `id = 't2'`, amount 50 USD
- WHEN `AccountingEngine` processes
- THEN entry 1: Dr Utilities (5.1.01) 50 USD; entry 2: Cr Bank Accounts (1.1.02) 50 USD

#### Scenario: Transfer generates two entries
- GIVEN transfer from wallet A (bank) to wallet B (cash), amount 200 USD
- WHEN `AccountingEngine` processes
- THEN entry 1: Dr Cash (1.1.01) 200 USD; entry 2: Cr Bank Accounts (1.1.02) 200 USD

#### Scenario: Entries always balance
- GIVEN any transaction
- WHEN entries generated
- THEN `SUM(debit amounts) = SUM(credit amounts)` for that `financial_transaction_id`

---

### Requirement: Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `chart_of_accounts_system` | `idx_coas_code` | `(account_code)` UNIQUE | Code lookup |
| `chart_of_accounts_system` | `idx_coas_type` | `(account_type)` | Filter by type |
| `chart_of_accounts_system` | `idx_coas_parent` | `(parent_id)` | Hierarchy traversal |
| `chart_of_accounts` | `idx_coa_condo_code` | `(condominium_id, account_code)` UNIQUE partial | Condo-scoped code lookup |
| `chart_of_accounts` | `idx_coa_condo_type` | `(condominium_id, account_type)` | Filter by type within condo |
| `chart_of_accounts` | `idx_coa_parent` | `(parent_id)` | Hierarchy traversal |
| `chart_of_accounts` | `idx_coa_system_ref` | `(system_account_id)` | Reverse lookup to system |
| `financial_transaction_entries` | `idx_fte_transaction` | `(financial_transaction_id)` | Entries for a transaction |
| `financial_transaction_entries` | `idx_fte_account` | `(account_id, created_at)` | Ledger for an account |
| `financial_transaction_entries` | `idx_fte_condo_date` | `(condominium_id, created_at DESC)` | Condo journal |
| `financial_transaction_entries` | `idx_fte_status` | `(entry_status)` | Filter active/voided |

#### Scenario: Ledger query uses index
- GIVEN 10,000 entries for account X
- WHEN `SELECT ... WHERE account_id = X ORDER BY created_at`
- THEN `idx_fte_account` is used (verified via `EXPLAIN`)

---

### Requirement: Row Level Security

RLS SHALL be enabled on all three tables.

**`chart_of_accounts_system`** — read-only for all authenticated users:

| Policy | For | Using |
|--------|-----|-------|
| System accounts readable by all | SELECT | `auth.role() = 'authenticated'` |

**`chart_of_accounts`** — condo-scoped:

| Policy | For | Using | With Check |
|--------|-----|-------|------------|
| Members view condo accounts | SELECT | `deleted_at IS NULL AND member of condominium` | — |
| Admin/operator manage accounts | ALL | `deleted_at IS NULL AND admin/operator role` | `admin/operator role` |
| System accounts protected | DELETE | `NOT is_system` | — |

**`financial_transaction_entries`** — condo-scoped:

| Policy | For | Using | With Check |
|--------|-----|-------|------------|
| Members view entries | SELECT | `member of condominium` | — |
| Admin/operator manage entries | INSERT/UPDATE | `admin/operator role` | `admin/operator role` |

#### Scenario: Non-member blocked from entries
- GIVEN user NOT member of condo Y
- WHEN SELECT on `financial_transaction_entries`
- THEN zero rows

#### Scenario: System account delete blocked by RLS
- GIVEN `is_system = true` row in `chart_of_accounts`
- WHEN DELETE attempted by admin
- THEN RLS policy "System accounts protected" blocks

---

### Requirement: Balance Update Trigger

Function `update_account_balance()` SHALL fire AFTER INSERT on `financial_transaction_entries`:

1. If `entry_type = 'debit'` AND `normal_balance = 'debit'` → `current_balance += amount`.
2. If `entry_type = 'credit'` AND `normal_balance = 'credit'` → `current_balance += amount`.
3. If `entry_type = 'debit'` AND `normal_balance = 'credit'` → `current_balance -= amount`.
4. If `entry_type = 'credit'` AND `normal_balance = 'debit'` → `current_balance -= amount`.

Also updates `condominium_accounts.current_balance` for the wallet mapped to the entry's chart account.

#### Scenario: Debit increases asset balance
- GIVEN chart account "Bank Accounts" with `normal_balance = 'debit'`, `current_balance = 1000`
- WHEN debit entry of 200 inserted
- THEN `current_balance = 1200`

#### Scenario: Credit decreases asset balance
- GIVEN chart account "Bank Accounts" with `normal_balance = 'debit'`, `current_balance = 1200`
- WHEN credit entry of 200 inserted
- THEN `current_balance = 1000`

#### Scenario: Voided entry reverses balance
- GIVEN voided entry inserted (entry_status = 'voided')
- WHEN trigger fires
- THEN balance adjustment is reversed (opposite direction)

---

### Requirement: RPC Functions

| Function | Purpose |
|----------|---------|
| `validate_double_entry(p_transaction_id uuid)` | Returns boolean: `SUM(debits) = SUM(credits)` for the given transaction |
| `get_account_ledger(p_account_id uuid, p_date_from date, p_date_to date)` | Returns entries for an account within date range, ordered by date |
| `get_trial_balance(p_condominium_id uuid, p_date date)` | Returns aggregated debits and credits per account as of date |

All functions use `security definer`, `set search_path = public`.

#### Scenario: Balanced entries validate
- GIVEN transaction with Dr 100 + Cr 100
- WHEN `validate_double_entry(tx_id)` called
- THEN returns `true`

#### Scenario: Unbalanced entries detected
- GIVEN transaction with Dr 100 + Cr 90
- WHEN `validate_double_entry(tx_id)` called
- THEN returns `false`

---

### Requirement: Grants

```sql
grant select on chart_of_accounts_system to authenticated;
grant select on chart_of_accounts_system to anon;
grant select, insert, update, delete on chart_of_accounts to authenticated;
grant select on chart_of_accounts to anon;
grant select, insert, update on financial_transaction_entries to authenticated;
grant select on financial_transaction_entries to anon;
grant execute on function validate_double_entry(uuid) to authenticated;
grant execute on function get_account_ledger(uuid, date, date) to authenticated;
grant execute on function get_trial_balance(uuid, date) to authenticated;
```
