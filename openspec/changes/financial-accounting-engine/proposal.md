# Proposal: Financial Accounting Engine (Phase 3)

## Intent

Automate double-entry bookkeeping for every financial transaction without requiring accounting knowledge from users. When an admin records an income, expense, or transfer (Phase 2), the accounting engine transparently generates balanced debit/credit journal entries against a structured chart of accounts. This phase is **backend-only** — no UI changes.

## Scope

### In Scope
- `chart_of_accounts_system` — 30 immutable global accounts (5 L1, 11 L2, 14 L3) seeded once
- `chart_of_accounts` — per-condo accounts auto-populated from system template on condo creation
- `financial_transaction_entries` — auto-generated debit/credit entries linked to source transactions
- `ChartOfAccountsSystemService` — read-only service for global account catalog
- `ChartOfAccountsService` — CRUD with system-defined protection (no delete/rename on system accounts)
- `AccountingEngineService` — generates balanced entries on transaction creation/status change
- Integration: modify `FinancialTransactions.create()` and `createTransfer()` to invoke `AccountingEngine`
- Wallet balance auto-update via DB trigger on entry creation
- 2 telemetry events: `ACCOUNTING_ENTRY_CREATED`, `DOUBLE_ENTRY_VALIDATED`
- Unit tests: services 80%+, DB functions verified via migration tests

### Out of Scope
- Accounting UI / journal view / ledger reports (Phase 4+)
- Trial balance, income statement, balance sheet reports (Phase 5)
- Account reconciliation, reversal entries UI (Phase 4)
- Multi-currency consolidation reports (Phase 6)
- Budget tracking, fiscal compliance reports

## Capabilities

### New Capabilities
- `accounting-db`: Database schema for `chart_of_accounts_system`, `chart_of_accounts`, `financial_transaction_entries` — indexes, RLS, auto-populate trigger, balance-update trigger, seed data (30 accounts)
- `accounting-services`: Three services (`ChartOfAccountsSystem`, `ChartOfAccounts`, `AccountingEngine`) — entry generation logic, account mapping rules, integration with `FinancialTransactions`, telemetry

### Modified Capabilities
None — `openspec/specs/` has no existing specs. Phase 1/2 capabilities (`condominium-accounts`, `transaction-categories`, `financial-transactions`) are consumed but not modified at the spec level.

## Approach

Follow Phase 1/2 patterns exactly:
- **Services**: `@Injectable({ providedIn: 'root' })`, `inject()` DI, BehaviorSubjects, offline-first where applicable
- **AccountingEngine**: Pure logic service — no offline queue (entries are derived, not user-created). Called synchronously after transaction insert succeeds
- **Account mapping**: Wallet `account_type` → asset account code; Category `category_type` → income/expense account code
- **Entry generation**: Income → Dr Asset / Cr Income; Expense → Dr Expense / Cr Asset; Transfer → Dr Asset(dest) / Cr Asset(source)
- **Balance updates**: DB trigger on `financial_transaction_entries` INSERT updates `condominium_accounts.current_balance`
- **System accounts**: Seeded via migration INSERT (not trigger) — one-time global catalog
- **Per-condo population**: Trigger on `condominiums` INSERT copies all system accounts into `chart_of_accounts`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | 1 migration: 3 tables, indexes, RLS, triggers, seed data, RPCs |
| `src/app-types/` | New | `chart-of-accounts.ts`, `financial-transaction-entries.ts` + barrel export |
| `src/app/core/services/chart-of-accounts-system/` | New | Read-only service for global accounts |
| `src/app/core/services/chart-of-accounts/` | New | CRUD service with system protection |
| `src/app/core/services/accounting-engine/` | New | Entry generation logic |
| `src/app/core/services/financial-transactions/` | Modified | `create()` and `createTransfer()` invoke `AccountingEngine` |
| `src/app/core/services/telemetry/telemetry.types.ts` | Modified | 2 new events |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Entry generation fails after transaction insert — orphan transaction without entries | Med | `AccountingEngine` runs in same async flow; if entry insert fails, transaction insert is rolled back (Supabase transaction wrapper) or flagged for reconciliation |
| Balance trigger fires on voided entries — incorrect running balance | Med | Trigger checks `entry_status`; voided entries generate reversal entries that net to zero |
| System account codes change between versions — per-condo accounts become stale | Low | System accounts are immutable (code is PK-like); new accounts added, never modified |
| Offline transaction creation delays entry generation until sync | Med | Entries generated server-side via trigger OR on sync completion; offline transactions show "pending entries" state |

## Rollback Plan

1. `DROP TABLE IF EXISTS financial_transaction_entries CASCADE;`
2. `DROP TABLE IF EXISTS chart_of_accounts CASCADE;`
3. `DROP TABLE IF EXISTS chart_of_accounts_system CASCADE;`
4. Drop all triggers, RPC functions
5. Remove `AccountingEngine` invocation from `FinancialTransactions` service
6. Remove 3 new services and type files
7. Remove telemetry events — no downstream consumers

## Dependencies

- Phase 1 (`financial-wallets-categories`) — `condominium_accounts` and `transaction_categories` tables exist
- Phase 2 (`financial-transactions-basic`) — `financial_transactions` table and service exist
- `ContextService` for active `condominium_id`
- `TelemetryService` for event tracking

## Success Criteria

- [ ] Every `financial_transactions` row with `status = 'completed'` has exactly 2 balanced entries (sum of debits = sum of credits)
- [ ] System chart of accounts seeded with 30 accounts (5 L1 + 11 L2 + 14 L3)
- [ ] Per-condo chart auto-populated on condominium creation
- [ ] Income transaction generates Dr Asset / Cr Income entries
- [ ] Expense transaction generates Dr Expense / Cr Asset entries
- [ ] Transfer generates Dr Asset(dest) / Cr Asset(source) entries
- [ ] `condominium_accounts.current_balance` updated automatically via trigger
- [ ] System accounts cannot be deleted or code-modified from service
- [ ] Telemetry fires `ACCOUNTING_ENTRY_CREATED` and `DOUBLE_ENTRY_VALIDATED`
- [ ] Services have 80%+ unit test coverage
