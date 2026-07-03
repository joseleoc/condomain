# Design: Financial Accounting Engine (Phase 3)

## Technical Approach

Single migration file creating 3 tables (`chart_of_accounts_system`, `chart_of_accounts`, `financial_transaction_entries`) with indexes, RLS, auto-populate trigger, balance-update trigger, seed data (30 accounts), and RPC functions. Three services: `ChartOfAccountsSystem` (read-only), `ChartOfAccounts` (offline-first CRUD), `AccountingEngine` (entry generation). Integration modifies `FinancialTransactions.create()` and `createTransfer()` to invoke `AccountingEngine` post-insert. No UI — backend, services, and telemetry only.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Entry generation timing | Synchronous after transaction insert | DB trigger on `financial_transactions` INSERT | Service-level gives better error handling, telemetry, and testability; trigger would be opaque |
| Entry storage | Separate `financial_transaction_entries` table | Columns on `financial_transactions` | Clean separation; entries have their own lifecycle (active/voided); supports future reporting queries |
| System accounts seeding | Migration INSERT (one-time) | Trigger on app startup | Idempotent, version-controlled, no runtime overhead |
| Per-condo account population | Trigger on `condominiums` INSERT | Service-level copy on first access | Ensures accounts exist before any transaction; no lazy-init race conditions |
| Balance updates | DB trigger on entries INSERT | Service-level balance computation | Atomic, consistent, no stale reads; survives direct DB writes |
| Account mapping | Static code mapping in `AccountingEngine` | DB mapping table | 30 accounts with fixed codes — mapping table adds complexity without benefit; can migrate later |
| Entry failure handling | Log error, don't roll back transaction | Roll back transaction in DB transaction | Transactions are user-facing; entries are derived and can be regenerated; don't block user workflow |
| Offline entry generation | Deferred until sync | Generate locally | Entries require chart account lookups that may not be cached; derived data shouldn't be queued |
| System account protection | RLS + service-level guard | Trigger only | Service gives UX feedback; RLS blocks direct writes; defense in depth |
| Migration count | Single file for all 3 tables + seed + triggers | Multiple migrations | One logical delta; avoids FK ordering issues between tables |

## Data Flow

```
Transaction Creation → Entry Generation:
  FinancialTransactions.create(data)
    → Supabase INSERT financial_transactions → returns tx
    → AccountingEngine.generateEntries(tx)
       → resolveWalletToAccount(tx.account_id)
          → CondominiumAccounts.getById(account_id) → account_type
          → MAP: account_type → system account code → chart_of_accounts.id
       → resolveCategoryToAccount(tx.category_id)
          → TransactionCategories.getById(category_id) → i18n_key, category_type
          → MAP: i18n_key → system account code → chart_of_accounts.id
       → buildEntryPair(tx, debitAccountId, creditAccountId)
          → Income: Dr asset, Cr income
          → Expense: Dr expense, Cr asset
          → Transfer: Dr dest_asset, Cr source_asset
       → Supabase INSERT financial_transaction_entries (2 rows)
       → DB trigger: update_account_balance() fires for each entry
          → chart_of_accounts.current_balance updated
          → condominium_accounts.current_balance updated (via wallet mapping)
       → TelemetryService.track(ACCOUNTING_ENTRY_CREATED)
       → AccountingEngine.validateEntries(tx.id)
       → TelemetryService.track(DOUBLE_ENTRY_VALIDATED)

Transfer Creation → Entry Generation (both legs):
  FinancialTransactions.createTransfer(data)
    → expense leg INSERT → AccountingEngine.generateEntries(expenseLeg)
    → income leg INSERT → AccountingEngine.generateEntries(incomeLeg)

Status Void → Entry Voiding:
  FinancialTransactions.updateStatus(id, 'voided')
    → AccountingEngine.voidEntriesForTransaction(id)
       → Supabase UPDATE financial_transaction_entries SET entry_status = 'voided'
       → DB trigger reverses balance adjustments

Offline Transaction:
  FinancialTransactions.create(data) [offline]
    → LocalRepository + SyncService.enqueueMutation
    → NO entry generation (deferred)
  SyncService.processOutbox() [reconnect]
    → Transaction synced to Supabase
    → Post-sync hook: AccountingEngine.generateEntries(syncedTx)
```

## Account Mapping Logic

```
resolveWalletToAccount(walletId: string, condoId: string):
  1. Fetch wallet via CondominiumAccounts.getById(walletId)
  2. Map account_type → system code:
     'cash'       → '1.1.01'
     'bank'       → '1.1.02'
     'wallet'     → '1.1.03'
     'credit'     → '2.1.03'
     'investment' → '1.1.05'
  3. Lookup chart_of_accounts WHERE condominium_id = condoId AND account_code = mapped_code
  4. Return chart_of_accounts.id

resolveCategoryToAccount(categoryId: string, condoId: string):
  1. Fetch category via TransactionCategories.getById(categoryId)
  2. Try exact match: i18n_key → system code mapping table
  3. If no exact match: try prefix match (e.g., 'maintenance_*' → '5.3')
  4. If no prefix match: fallback by category_type:
     'income'  → '4.1' (Operating Income)
     'expense' → '5.1' (Operating Expenses)
  5. Lookup chart_of_accounts WHERE condominium_id = condoId AND account_code = resolved_code
  6. Return chart_of_accounts.id
```

## File Changes

| File | Action | Description |
|---|---|---|
| `supabase/migrations/20260703000000_financial_accounting_engine.sql` | Create | 3 tables, indexes, RLS, triggers, seed data, RPCs, grants |
| `src/app-types/chart-of-accounts.ts` | Create | `ChartOfAccountsSystem`, `ChartOfAccount`, `ChartOfAccountTreeNode`, DTOs |
| `src/app-types/financial-transaction-entries.ts` | Create | `FinancialTransactionEntry`, `EntryPair`, `CreateEntryData` |
| `src/app-types/index.ts` | Modify | Barrel exports for both new type files |
| `src/app/core/services/chart-of-accounts-system/chart-of-accounts-system.ts` | Create | Read-only service for global accounts |
| `src/app/core/services/chart-of-accounts-system/chart-of-accounts-system.spec.ts` | Create | Unit tests |
| `src/app/core/services/chart-of-accounts/chart-of-accounts.ts` | Create | CRUD service with system protection |
| `src/app/core/services/chart-of-accounts/chart-of-accounts.spec.ts` | Create | Unit tests |
| `src/app/core/services/accounting-engine/accounting-engine.ts` | Create | Entry generation, mapping, validation |
| `src/app/core/services/accounting-engine/accounting-engine.spec.ts` | Create | Unit tests |
| `src/app/core/services/financial-transactions/financial-transactions.ts` | Modify | Inject `AccountingEngine`, call after create/createTransfer/updateStatus |
| `src/app/core/services/financial-transactions/financial-transactions.spec.ts` | Modify | Add tests for engine invocation |
| `src/app/core/services/sync/sync-service.ts` | Modify | Add `chart_account` RPC mappings |
| `src/app/core/services/sync/sync-service.spec.ts` | Modify | Add mapping tests |
| `src/app/core/services/telemetry/telemetry.types.ts` | Modify | Add `ACCOUNTING_ENTRY_CREATED`, `DOUBLE_ENTRY_VALIDATED` |
| `src/assets/i18n/es.json` | Modify | System account name translations |
| `src/assets/i18n/en.json` | Modify | System account name translations |

## Interfaces / Contracts

```typescript
// src/app-types/chart-of-accounts.ts
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type NormalBalance = 'debit' | 'credit';
export type AccountLevel = 1 | 2 | 3;

export interface ChartOfAccountsSystem {
  id: string; account_code: string; account_name: string;
  account_type: AccountType; normal_balance: NormalBalance;
  level: AccountLevel; parent_id: string | null;
  is_active: boolean; i18n_key: string;
  created_at: string; updated_at: string;
}

export interface ChartOfAccount extends ChartOfAccountsSystem {
  condominium_id: string; system_account_id: string | null;
  is_system: boolean; current_balance: number; deleted_at: string | null;
}

// src/app-types/financial-transaction-entries.ts
export interface FinancialTransactionEntry {
  id: string; condominium_id: string;
  financial_transaction_id: string; account_id: string;
  entry_type: 'debit' | 'credit'; amount: number;
  currency: string; exchange_rate: number; base_amount: number;
  description: string | null; entry_status: 'active' | 'voided';
  created_at: string; updated_at: string;
}
```

Service APIs:
- `ChartOfAccountsSystem`: `fetchAll()`, `getByCode(code)`, `getByType(type)`, `buildTree()`
- `ChartOfAccounts`: `fetchByCondominium(id)`, `getById(id)`, `getByCode(condoId, code)`, `create(data)`, `update(id, data)`, `delete(id)`, `buildTree(condoId)`
- `AccountingEngine`: `generateEntries(tx)`, `getEntriesForTransaction(txId)`, `validateEntries(txId)`, `voidEntriesForTransaction(txId)`

## Testing Strategy

| Layer | What | Approach | Coverage Target |
|---|---|---|---|
| Unit — Types | Interface parity with DB schema | Compile-time checks + field assertions | 100% |
| Unit — ChartOfAccountsSystem | fetchAll online/offline, getByCode, getByType, buildTree | Mock Supabase, NetworkStatusService, LocalRepository | 80%+ |
| Unit — ChartOfAccounts | fetchByCondominium, system delete reject, system code update reject, custom CRUD, offline queue | Mock all deps, verify BehaviorSubject emissions | 80%+ |
| Unit — AccountingEngine | Income/expense/transfer entry generation, wallet mapping, category mapping (exact, prefix, fallback), multi-currency, validation, void | Mock ChartOfAccounts, Supabase | 80%+ |
| Unit — AccountingEngine | Entry failure doesn't block transaction | Mock Supabase insert failure, verify error logged | 80%+ |
| Unit — FinancialTransactions | Engine invoked after create, createTransfer, updateStatus(voided) | Mock AccountingEngine, verify calls | 80%+ |
| Unit — SyncService | `chart_account` RPC mapping | Verify `#buildRpcName` returns correct names | 80%+ |
| Unit — i18n | System account name keys resolve | Iterate keys, assert non-empty | 100% |

## Migration / Rollout

### Migration: `20260703000000_financial_accounting_engine.sql`

Single additive migration. Structure:
1. `chart_of_accounts_system` table + level-depth trigger + seed INSERT (30 rows)
2. `chart_of_accounts` table + auto-populate trigger on `condominiums` INSERT
3. `financial_transaction_entries` table + balance-update trigger
4. Indexes (11 total across 3 tables)
5. RLS policies (6 policies across 3 tables)
6. RPC functions: `validate_double_entry`, `get_account_ledger`, `get_trial_balance`, `soft_delete_chart_account`, `insert_chart_account_idempotent`, `update_chart_account_idempotent`
7. Grants

### Rollback

```sql
DROP TABLE IF EXISTS public.financial_transaction_entries CASCADE;
DROP TABLE IF EXISTS public.chart_of_accounts CASCADE;
DROP TABLE IF EXISTS public.chart_of_accounts_system CASCADE;
DROP FUNCTION IF EXISTS public.validate_double_entry;
DROP FUNCTION IF EXISTS public.get_account_ledger;
DROP FUNCTION IF EXISTS public.get_trial_balance;
DROP FUNCTION IF EXISTS public.seed_condominium_chart_of_accounts;
DROP FUNCTION IF EXISTS public.update_account_balance;
DROP FUNCTION IF EXISTS public.check_account_level_depth;
```

Then remove:
- `AccountingEngine` invocation from `FinancialTransactions`
- 3 new services, 2 type files, barrel exports
- `chart_account` case from SyncService
- Telemetry events
- i18n keys for system accounts

### Rollout Order

1. Migration (DB) — additive, safe
2. Types + barrel export — no runtime impact
3. `ChartOfAccountsSystem` service — read-only, no consumers yet
4. `ChartOfAccounts` service — no consumers yet
5. SyncService mapping — no impact until mutations queued
6. `AccountingEngine` service — no consumers yet
7. Telemetry events — no consumers yet
8. `FinancialTransactions` modification — engine goes live
9. i18n keys — required for account name display

## Open Questions

- [ ] Should `AccountingEngine` run inside a Supabase RPC (server-side transaction) instead of client-side sequential inserts? — Would guarantee atomicity but loses offline-first flexibility.
- [ ] Should the balance trigger also update `condominium_accounts.current_balance` directly, or should a separate sync job reconcile? — Direct trigger is simpler but couples the two tables.
