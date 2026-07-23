# Accounting Services Specification

## Purpose

Defines three Angular services for the accounting engine: read-only system account catalog, per-condo chart of accounts CRUD, and the core accounting engine that generates double-entry journal entries from transactions.

## Requirements

### Requirement: TypeScript Interfaces

**`src/app-types/chart-of-accounts.ts`:**

```typescript
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type NormalBalance = 'debit' | 'credit';
export type AccountLevel = 1 | 2 | 3;

export interface ChartOfAccountsSystem {
  id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  level: AccountLevel;
  parent_id: string | null;
  is_active: boolean;
  i18n_key: string;
  created_at: string;
  updated_at: string;
}

export interface ChartOfAccount extends ChartOfAccountsSystem {
  condominium_id: string;
  system_account_id: string | null;
  is_system: boolean;
  current_balance: number;
  deleted_at: string | null;
}

export interface ChartOfAccountTreeNode extends ChartOfAccount {
  children: ChartOfAccountTreeNode[];
}

export type CreateChartOfAccountData = Pick<
  ChartOfAccount,
  'condominium_id' | 'account_code' | 'account_name' | 'account_type' |
  'normal_balance' | 'level' | 'parent_id' | 'i18n_key'
>;
```

**`src/app-types/financial-transaction-entries.ts`:**

```typescript
export type EntryType = 'debit' | 'credit';
export type EntryStatus = 'active' | 'voided';

export interface FinancialTransactionEntry {
  id: string;
  condominium_id: string;
  financial_transaction_id: string;
  account_id: string;
  entry_type: EntryType;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_amount: number;
  description: string | null;
  entry_status: EntryStatus;
  created_at: string;
  updated_at: string;
}

export interface EntryPair {
  debit: CreateEntryData;
  credit: CreateEntryData;
}

export interface CreateEntryData {
  condominium_id: string;
  financial_transaction_id: string;
  account_id: string;
  entry_type: EntryType;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_amount: number;
  description: string | null;
}
```

#### Scenario: Type parity
- GIVEN interfaces vs DB schema comparison
- THEN all columns match with correct nullability

---

### Requirement: `ChartOfAccountsSystem` Service

`@Injectable({ providedIn: 'root' })`, `inject()` DI. Deps: `Supabase`, `NetworkStatusService`, `LocalRepository`.

**Read-only** — no create/update/delete. Fetches the global system account catalog.

State: `BehaviorSubject<ChartOfAccountsSystem[]>`, `loading$`, `error$`.

| Method | Online | Offline |
|--------|--------|---------|
| `fetchAll()` | Supabase `SELECT * FROM chart_of_accounts_system ORDER BY account_code`, cache via `upsert('chart_account_system', ...)` | `getEntitiesByType('chart_account_system')` |
| `getByCode(code)` | Supabase `.eq('account_code', code).single()`, cache | `getByType('chart_account_system')`, filter by code |
| `getByType(type)` | Supabase `.eq('account_type', type)`, cache | Filter cached by type |
| `buildTree()` | Returns `ChartOfAccountsSystem[]` organized as tree (L1→L2→L3) | Same from cache |

#### Scenario: Fetch all online
- GIVEN online, `fetchAll()` called
- THEN returns 30 system accounts, each cached locally

#### Scenario: Fetch offline
- GIVEN offline, 30 accounts cached
- THEN returns 30 cached accounts

#### Scenario: Build tree
- GIVEN 30 accounts loaded
- WHEN `buildTree()` called
- THEN returns 5 L1 nodes, each with L2 children, each L2 with L3 children

---

### Requirement: `ChartOfAccounts` Service

`@Injectable({ providedIn: 'root' })`, `inject()` DI. Deps: `Supabase`, `NetworkStatusService`, `LocalRepository`, `SyncService`, `TelemetryService`.

CRUD with system-account protection. Offline-first via `LocalRepository` + `SyncService`.

State: `BehaviorSubject<ChartOfAccount[]>`, `loading$`, `error$`.

| Method | Online | Offline |
|--------|--------|---------|
| `fetchByCondominium(id)` | Supabase query, cache via `upsert('chart_account', ...)` | `getEntitiesByType('chart_account')`, filter by condo |
| `getById(id)` | Supabase `.single()`, cache | `getById('chart_account', id)` |
| `getByCode(condoId, code)` | Supabase `.eq('condominium_id', condoId).eq('account_code', code).single()` | Filter cached |
| `create(data)` | Supabase insert, cache | UUID + `_local_status:'pending'`, enqueue |
| `update(id, data)` | Reject if `is_system = true` (code/name changes). Optimistic → Supabase. Revert on error | Reject if `is_system` → enqueue |
| `delete(id)` | Reject if `is_system = true`. Optimistic `deleted_at` → Supabase. Revert on error | Reject if `is_system` → enqueue |
| `buildTree(condoId)` | Returns tree structure for the condo | Same from cache |

#### Scenario: Fetch condo accounts
- GIVEN condo has 30 system accounts + 2 custom
- WHEN `fetchByCondominium(id)` called
- THEN returns 32 accounts

#### Scenario: System account delete rejected
- GIVEN `is_system = true` account
- WHEN `delete(id)` called
- THEN error thrown "System accounts cannot be deleted"

#### Scenario: System account code update rejected
- GIVEN `is_system = true` account
- WHEN `update(id, { account_code: '9.9.99' })` called
- THEN error thrown "System account codes cannot be modified"

#### Scenario: Custom account create offline
- GIVEN offline, `create({ is_system: false, ... })` called
- THEN local row created, mutation enqueued

#### Scenario: Build tree for condo
- GIVEN 32 accounts loaded
- WHEN `buildTree(condoId)` called
- THEN returns hierarchical tree with custom accounts at correct level

---

### Requirement: `AccountingEngine` Service

`@Injectable({ providedIn: 'root' })`, `inject()` DI. Deps: `Supabase`, `ChartOfAccounts`, `ChartOfAccountsSystem`, `TelemetryService`.

**Not offline-first** — entries are derived data generated server-side. When offline, entry generation is deferred until sync completes.

State: `BehaviorSubject<FinancialTransactionEntry[]>` (entries for current transaction), `loading$`, `error$`.

| Method | Description |
|--------|-------------|
| `generateEntries(transaction)` | Core logic: maps transaction to debit/credit entry pair, inserts both |
| `getEntriesForTransaction(txId)` | Fetches all entries for a given transaction |
| `validateEntries(txId)` | Verifies `SUM(debits) = SUM(credits)` for a transaction |
| `voidEntriesForTransaction(txId)` | Sets `entry_status = 'voided'` on all entries for a transaction |

#### Scenario: Income entry generation
- GIVEN income transaction: `account_id = wallet_A (bank)`, `category_id = monthly_fees`, `amount = 100 USD`
- WHEN `generateEntries(tx)` called
- THEN resolves wallet_A → chart account `1.1.02` (Bank Accounts)
- THEN resolves category → chart account `4.1.01` (Monthly Fees)
- THEN inserts: Dr `1.1.02` 100 USD, Cr `4.1.01` 100 USD

#### Scenario: Expense entry generation
- GIVEN expense transaction: `account_id = wallet_A (bank)`, `category_id = utilities`, `amount = 50 USD`
- WHEN `generateEntries(tx)` called
- THEN resolves wallet_A → `1.1.02` (Bank Accounts)
- THEN resolves category → `5.1.01` (Utilities)
- THEN inserts: Dr `5.1.01` 50 USD, Cr `1.1.02` 50 USD

#### Scenario: Transfer entry generation
- GIVEN transfer: `source = wallet_A (bank)`, `destination = wallet_B (cash)`, `amount = 200 USD`
- WHEN `generateEntries(tx)` called for each leg
- THEN expense leg: resolves wallet_A → `1.1.02`; inserts Cr `1.1.02` 200 USD
- THEN income leg: resolves wallet_B → `1.1.01` (Cash); inserts Dr `1.1.01` 200 USD
- NOTE: Transfer legs share `financial_transaction_id` via their respective transaction rows

#### Scenario: Wallet-to-account mapping
- GIVEN wallet with `account_type = 'bank'`
- WHEN resolved to chart account
- THEN maps to `1.1.02` (Bank Accounts) for that condo

- GIVEN wallet with `account_type = 'cash'`
- THEN maps to `1.1.01` (Cash)

- GIVEN wallet with `account_type = 'wallet'`
- THEN maps to `1.1.03` (Digital Wallets)

- GIVEN wallet with `account_type = 'credit'`
- THEN maps to `2.1.03` (Credit Cards)

- GIVEN wallet with `account_type = 'investment'`
- THEN maps to `1.1.05` (Reserve Fund)

#### Scenario: Category-to-account mapping
- GIVEN category with `category_type = 'income'` and `i18n_key = 'fees_monthly'`
- WHEN resolved to chart account
- THEN maps to `4.1.01` (Monthly Fees) if exact match exists, else `4.1` (Operating Income) as fallback

- GIVEN category with `category_type = 'expense'` and `i18n_key = 'services_electricity'`
- THEN maps to `5.1.01` (Utilities) if exact match exists, else `5.1` (Operating Expenses) as fallback

#### Scenario: Multi-currency entry
- GIVEN transaction with `original_currency = 'EUR'`, `exchange_rate = 1.08`, `amount = 50`
- WHEN entries generated
- THEN `amount = 50`, `currency = 'EUR'`, `exchange_rate = 1.08`, `base_amount = 54.00`

#### Scenario: Balance validation after generation
- GIVEN entries inserted for transaction
- WHEN `validateEntries(txId)` called
- THEN returns `true` (SUM debits = SUM credits)
- THEN telemetry fires `DOUBLE_ENTRY_VALIDATED`

#### Scenario: Void on transaction void
- GIVEN transaction status changed to `voided`
- WHEN `voidEntriesForTransaction(txId)` called
- THEN all entries for `txId` set to `entry_status = 'voided'`
- THEN balance trigger reverses adjustments

---

### Requirement: Account Mapping Rules

The `AccountingEngine` SHALL resolve wallet and category to chart accounts using these rules:

**Wallet → Asset/Liability account (by `account_type`):**

| `account_type` | System Account Code | Account Name |
|----------------|-------------------|--------------|
| `cash` | `1.1.01` | Cash |
| `bank` | `1.1.02` | Bank Accounts |
| `wallet` | `1.1.03` | Digital Wallets |
| `credit` | `2.1.03` | Credit Cards |
| `investment` | `1.1.05` | Reserve Fund |

**Category → Income/Expense account (by `i18n_key` match, with fallback):**

| Category `i18n_key` | System Account Code | Fallback Code |
|---------------------|-------------------|---------------|
| `fees_monthly` | `4.1.01` | `4.1` |
| `fees_extraordinary` | `4.1.02` | `4.1` |
| `other_income` | `4.2` | `4.2` |
| `services_electricity` | `5.1.01` | `5.1` |
| `services_water` | `5.1.01` | `5.1` |
| `services_gas` | `5.1.01` | `5.1` |
| `services_internet` | `5.1.02` | `5.1` |
| `services_phone` | `5.1.02` | `5.1` |
| `services_waste` | `5.1.02` | `5.1` |
| `maintenance_*` | — | `5.3` |
| `administration_*` | — | `5.2` |
| `security` | — | `5.1` |
| `cleaning` | — | `5.1` |

Resolution: exact `i18n_key` match first → prefix match → parent category type fallback.

#### Scenario: Exact match resolution
- GIVEN category `i18n_key = 'fees_monthly'`
- WHEN resolved
- THEN chart account `4.1.01`

#### Scenario: Prefix fallback
- GIVEN category `i18n_key = 'maintenance_elevator'` (user-created, no exact match)
- WHEN resolved
- THEN prefix `maintenance` matches → chart account `5.3` (Maintenance Expenses)

#### Scenario: Type fallback
- GIVEN category `i18n_key = null` (user-created, no i18n), `category_type = 'expense'`
- WHEN resolved
- THEN fallback to `5.1` (Operating Expenses)

---

### Requirement: Integration with `FinancialTransactions`

The `FinancialTransactions` service SHALL be modified to invoke `AccountingEngine` after successful transaction creation:

1. `create()`: After Supabase insert succeeds, call `AccountingEngine.generateEntries(transaction)`.
2. `createTransfer()`: After both legs inserted, call `AccountingEngine.generateEntries()` for each leg.
3. `updateStatus()`: When status changes to `voided`, call `AccountingEngine.voidEntriesForTransaction()`.
4. If `AccountingEngine` throws, log error but do NOT roll back the transaction (entries can be regenerated).

#### Scenario: Income creation triggers entries
- GIVEN `FinancialTransactions.create(incomeData)` succeeds
- THEN `AccountingEngine.generateEntries(tx)` called with the returned transaction

#### Scenario: Transfer creation triggers entries for both legs
- GIVEN `FinancialTransactions.createTransfer(data)` succeeds
- THEN `AccountingEngine.generateEntries(expenseLeg)` and `AccountingEngine.generateEntries(incomeLeg)` called

#### Scenario: Void status triggers entry voiding
- GIVEN `FinancialTransactions.updateStatus(id, 'voided')` succeeds
- THEN `AccountingEngine.voidEntriesForTransaction(id)` called

#### Scenario: Engine failure does not block transaction
- GIVEN `AccountingEngine.generateEntries()` throws
- THEN transaction remains persisted, error logged, telemetry fires `ACCOUNTING_ENTRY_FAILED`

---

### Requirement: Telemetry Events

Add to `TelemetryEvents`:

| Constant | Value | Properties |
|----------|-------|------------|
| `ACCOUNTING_ENTRY_CREATED` | `'accounting_entry_created'` | `transaction_id`, `entry_count`, `total_debit`, `total_credit`, `condominium_id` |
| `DOUBLE_ENTRY_VALIDATED` | `'double_entry_validated'` | `transaction_id`, `is_balanced`, `condominium_id` |

#### Scenario: Track entry creation
- GIVEN entries generated for transaction
- THEN `ACCOUNTING_ENTRY_CREATED` fired with entry count and totals

#### Scenario: Track validation
- GIVEN `validateEntries()` called
- THEN `DOUBLE_ENTRY_VALIDATED` fired with `is_balanced` boolean

---

### Requirement: SyncService RPC Mappings

No new sync entity types for `financial_transaction_entries` — entries are generated server-side, not user-created. The `chart_of_accounts` entity type SHALL be added for custom account CRUD:

| mutation_type | RPC name |
|---------------|----------|
| `create` | `insert_chart_account_idempotent` |
| `update` | `update_chart_account_idempotent` |
| `delete` | `soft_delete_chart_account` |

Sync entity type: `'chart_account'`.

#### Scenario: Custom account create maps correctly
- GIVEN `enqueueMutation('create', 'chart_account', ...)`
- WHEN `#buildRpcName` called
- THEN returns `'insert_chart_account_idempotent'`
