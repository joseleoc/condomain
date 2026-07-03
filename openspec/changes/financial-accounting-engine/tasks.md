# Tasks: Financial Accounting Engine (Phase 3)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2200–2600 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (DB) → PR 2 (Foundation) → PR 3 (Services) → PR 4 (Integration) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration + seed data | PR 1 | Additive, safe first slice |
| 2 | Types + telemetry + SyncService | PR 2 | Foundation, no feature impact |
| 3 | ChartOfAccountsSystem + ChartOfAccounts services | PR 3 | Core services |
| 4 | AccountingEngine + FinancialTransactions integration | PR 4 | Engine goes live |

## Phase 1: Database Migration

- [ ] 1.1 Create `chart_of_accounts_system` table — all columns, constraints, `account_code` UNIQUE, level CHECK
- [ ] 1.2 Create `check_account_level_depth()` trigger — validates L2 parent is L1, L3 parent is L2
- [ ] 1.3 Seed 30 system accounts via `INSERT ... ON CONFLICT (account_code) DO NOTHING` — 5 L1 + 11 L2 + 14 L3
- [ ] 1.4 Create `chart_of_accounts` table — all columns, partial unique `(condominium_id, account_code) WHERE deleted_at IS NULL`
- [ ] 1.5 Create `seed_condominium_chart_of_accounts()` trigger — fires AFTER INSERT on `condominiums`, copies all 30 system accounts with resolved parent_id references
- [ ] 1.6 Create `financial_transaction_entries` table — all columns, CHECK `amount > 0`, `entry_status` IN (`active`, `voided`)
- [ ] 1.7 Create `update_account_balance()` trigger — fires AFTER INSERT on entries, updates `chart_of_accounts.current_balance` and `condominium_accounts.current_balance`
- [ ] 1.8 Add 11 indexes across all 3 tables
- [ ] 1.9 Enable RLS: 6 policies (system read-only, condo-scoped chart accounts, condo-scoped entries, system delete protection)
- [ ] 1.10 Create RPCs: `validate_double_entry`, `get_account_ledger`, `get_trial_balance`, `soft_delete_chart_account`, `insert_chart_account_idempotent`, `update_chart_account_idempotent`
- [ ] 1.11 Add grants + verify with `supabase db push --local`

## Phase 2: Foundation Layer

- [ ] 2.1 Create types: `ChartOfAccountsSystem`, `ChartOfAccount`, `ChartOfAccountTreeNode`, `CreateChartOfAccountData` in `src/app-types/chart-of-accounts.ts`
- [ ] 2.2 Create types: `FinancialTransactionEntry`, `EntryPair`, `CreateEntryData`, `EntryType`, `EntryStatus` in `src/app-types/financial-transaction-entries.ts`
- [ ] 2.3 Barrel export both new type files + type parity tests
- [ ] 2.4 Add `ACCOUNTING_ENTRY_CREATED` and `DOUBLE_ENTRY_VALIDATED` to `telemetry.types.ts`
- [ ] 2.5 Add `chart_account` case to SyncService `#buildRpcName()` + mapping tests
- [ ] 2.6 Add system account i18n keys to `es.json` and `en.json` (30 account names under `accounting.system.*`)

## Phase 3: Core Services

- [ ] 3.1 Create `ChartOfAccountsSystem` service shell — `inject()` DI, BehaviorSubjects, read-only pattern
- [ ] 3.2 Implement `fetchAll()` — online Supabase + offline LocalRepository cache
- [ ] 3.3 Implement `getByCode(code)` and `getByType(type)` — filtered queries with caching
- [ ] 3.4 Implement `buildTree()` — organize flat array into L1→L2→L3 hierarchy
- [ ] 3.5 Write `ChartOfAccountsSystem` tests: online/offline fetch, tree building, caching
- [ ] 3.6 Create `ChartOfAccounts` service shell — `inject()` DI, BehaviorSubjects, offline-first pattern
- [ ] 3.7 Implement `fetchByCondominium(id)` — online Supabase + offline cache
- [ ] 3.8 Implement `getById(id)` and `getByCode(condoId, code)` — single account lookups
- [ ] 3.9 Implement `create(data)` — online/offline dual path for custom accounts
- [ ] 3.10 Implement `update(id, data)` — system account protection (reject code/name changes on `is_system`)
- [ ] 3.11 Implement `delete(id)` — system account protection (reject on `is_system`), soft delete
- [ ] 3.12 Implement `buildTree(condoId)` — condo-scoped hierarchy with custom accounts
- [ ] 3.13 Write `ChartOfAccounts` tests: CRUD, system protection, offline queue, tree building

## Phase 4: Accounting Engine + Integration

- [ ] 4.1 Create `AccountingEngine` service shell — `inject()` DI, `ChartOfAccounts` + `ChartOfAccountsSystem` + `Supabase` + `TelemetryService` deps
- [ ] 4.2 Implement `resolveWalletToAccount(walletId, condoId)` — wallet `account_type` → system code → chart account lookup
- [ ] 4.3 Implement `resolveCategoryToAccount(categoryId, condoId)` — exact match → prefix match → type fallback
- [ ] 4.4 Implement `generateEntries(transaction)` — build debit/credit pair based on transaction type, insert both rows
- [ ] 4.5 Implement `getEntriesForTransaction(txId)` — fetch all entries for a transaction
- [ ] 4.6 Implement `validateEntries(txId)` — verify SUM(debits) = SUM(credits), fire `DOUBLE_ENTRY_VALIDATED`
- [ ] 4.7 Implement `voidEntriesForTransaction(txId)` — set `entry_status = 'voided'` on all entries
- [ ] 4.8 Write `AccountingEngine` tests: income/expense/transfer generation, wallet mapping, category mapping (exact/prefix/fallback), multi-currency, validation, void
- [ ] 4.9 Modify `FinancialTransactions.create()` — inject `AccountingEngine`, call `generateEntries()` after successful insert
- [ ] 4.10 Modify `FinancialTransactions.createTransfer()` — call `generateEntries()` for each leg
- [ ] 4.11 Modify `FinancialTransactions.updateStatus()` — call `voidEntriesForTransaction()` when status = `voided`
- [ ] 4.12 Write `FinancialTransactions` integration tests: engine invoked on create, createTransfer, updateStatus(voided); engine failure logged but doesn't block
- [ ] 4.13 Run full test suite (services 80%+), verify balance trigger, seed idempotency, entry validation RPC
