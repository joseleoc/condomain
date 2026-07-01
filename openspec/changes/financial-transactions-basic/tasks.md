# Tasks: Basic Financial Transactions (Phase 2)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (DB) → PR 2 (Foundation) → PR 3 (Service) → PR 4 (UI+i18n) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration | PR 1 | Additive, safe first slice |
| 2 | Types + telemetry + SyncService | PR 2 | Foundation, no feature impact |
| 3 | FinancialTransactions service | PR 3 | Core logic, no UI yet |
| 4 | UI components + i18n | PR 4 | Feature goes live |

## Phase 1: Database Migration

- [x] 1.1 Create migration: `financial_transactions` table, all columns, FK refs, constraints
- [x] 1.2 Add 5 B-tree indexes + partial `(condominium_id, transaction_date DESC) WHERE deleted_at IS NULL`
- [x] 1.3 Enable RLS: member SELECT + admin/operator ALL policies
- [x] 1.4 Create `prevent_terminal_edit()` trigger blocking edits on completed/voided
- [x] 1.5 Create `check_status_transition()` trigger: pending→completed→voided only
- [x] 1.6 Create RPCs: `soft_delete_transaction`, `insert_/update_financial_transaction_idempotent`
- [x] 1.7 Add grants + verify with `supabase db push --local`

## Phase 2: Foundation Layer

- [x] 2.1 Create types: `FinancialTransaction`, union types, DTOs, `TransactionFilter`
- [x] 2.2 Barrel export + type parity tests
- [x] 2.3 Add `FINANCIAL_TRANSACTION_CREATED` to `telemetry.types.ts`
- [x] 2.4 Add `financial_transaction` case to SyncService `#buildRpcName()` + mapping tests

## Phase 3: FinancialTransactions Service

- [x] 3.1 Create service shell with `inject()` DI, BehaviorSubjects, offline-first pattern
- [x] 3.2 Implement `fetchByCondominium(id, filter?)` — online Supabase + offline LocalRepository
- [x] 3.3 Implement `getById`, `create`, `update` with online/offline dual paths
- [x] 3.4 Implement `createTransfer`: `transfer_group_id`, expense+income legs, partial sync
- [x] 3.5 Implement `updateStatus` with transition validation + `delete` via optimistic RPC
- [x] 3.6 Wire telemetry in `create` and `createTransfer`
- [x] 3.7 Write service tests: online/offline, transfers, transitions, validation

## Phase 4: UI Components

- [x] 4.1 Create `TransactionCard`: amount colored by type, status badge, swipe actions
- [x] 4.2 Write `TransactionCard` tests: styling, badges, swipe context
- [x] 4.3 Create `TransactionFormModal`: reactive form, conditional exchange rate, category by type
- [x] 4.4 Write `TransactionFormModal` tests: validation, conditional fields, submit
- [x] 4.5 Create `TransferFormModal`: source/dest selectors, amount, date
- [x] 4.6 Write `TransferFormModal` tests: same-account rejection, exclusion, submit
- [x] 4.7 Create `TransactionListPage`: filter bar, FABs, refresher, infinite-scroll, states
- [x] 4.8 Write `TransactionListPage` tests: states, filtering, pagination
- [x] 4.9 Add lazy route `/financial/transactions` in `app.routes.ts`

## Phase 5: i18n + Integration

- [x] 5.1 Add `financial.transactions.*` keys to `es.json`
- [x] 5.2 Add all keys to `en.json`
- [x] 5.3 Write i18n resolution tests + integration verification
