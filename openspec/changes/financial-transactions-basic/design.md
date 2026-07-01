# Design: Basic Financial Transactions (Phase 2)

## Technical Approach

Single migration file creating `financial_transactions` table with indexes, RLS, terminal-state guard, status-transition validator, soft-delete RPC, and idempotent sync functions. One offline-first service (`FinancialTransactions`) mirroring the `CondominiumAccounts` pattern. Transfers implemented as two linked transactions sharing a `transfer_group_id`. Feature UI extends `features/financial/` with one page-container and three presentational components.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Transfer storage | Two rows linked by `transfer_group_id` | Single row with source/dest columns | Phase 3 double-entry needs individual transaction rows; this avoids migration later |
| `base_amount` storage | Denormalized column (`amount * exchange_rate`) | Computed/generated column | Query performance for reports; avoids join on every read |
| Terminal state guard | BEFORE UPDATE trigger + service-level check | Service-only | Defense in depth — trigger blocks direct Supabase writes bypassing service |
| Status transitions | BEFORE UPDATE trigger with allowed map | CHECK constraint | CHECK can't express "old→new" transitions; trigger can compare OLD/NEW |
| Migration count | Single file for table + indexes + RLS + RPCs | Multiple migrations | One logical delta; avoids FK ordering issues with Phase 1 tables |
| Category on transfers | `category_id = NULL` | Force a "transfer" system category | Transfers are not income/expense — they shouldn't pollute category reports |
| Exchange rate default | `1.0` when same currency | Required always | UX: most transactions are in base currency; don't force users to enter 1.0 |
| Pagination | `LIMIT 50` with offset | Cursor-based | Simpler; Phase 3 can upgrade to virtual scroll if needed |

## Data Flow

```
Online — Create Income/Expense:
  UI → TransactionFormModal.submit()
     → FinancialTransactions.create(data)
        → Supabase .insert() → cache via LocalRepository.upsert('financial_transaction', ...)
        → TelemetryService.track(FINANCIAL_TRANSACTION_CREATED, {...})
        → BehaviorSubject.next(updated list)

Online — Create Transfer:
  UI → TransferFormModal.submit()
     → FinancialTransactions.createTransfer(data)
        → transfer_group_id = uuidv4()
        → Supabase .insert() leg 1 (expense, source) + leg 2 (income, dest)
        → Cache both → Telemetry → BehaviorSubject

Offline — Any Create:
  UI → FinancialTransactions.create(data)
     → local_id = uuidv4(), _local_status = 'pending'
     → LocalRepository.upsert('financial_transaction', {...})
     → SyncService.enqueueMutation('create', 'financial_transaction', id, payload, idempotency_key)

Status Transition:
  UI → TransactionCard swipe → statusChange.emit()
     → TransactionListPage → FinancialTransactions.updateStatus(id, newStatus)
        → Service validates transition (pending→completed, pending→voided, completed→voided)
        → Supabase .update() → cache → BehaviorSubject

Sync (reconnect):
  SyncService.processOutbox()
     → for each pending mutation: #buildRpcName('financial_transaction', type)
        → 'create' → insert_financial_transaction_idempotent(p_idempotency_key, ...)
        → 'update' → update_financial_transaction_idempotent(p_idempotency_key, ...)
        → 'delete' → soft_delete_financial_transaction(p_id, p_reversal_reason)
```

## Transfer Implementation Detail

```
createTransfer(data: CreateTransferData):
  1. Validate: amount > 0, source ≠ destination, date ≤ today
  2. transfer_group_id = uuidv4()
  3. base_amount = data.amount * data.exchange_rate
  4. expense_leg = {
       condominium_id, account_id: source, category_id: null,
       transaction_type: 'expense', status: 'pending',
       amount, original_currency, exchange_rate, base_amount,
       description, transaction_date, transfer_group_id
     }
  5. income_leg = { ...expense_leg, account_id: destination, transaction_type: 'income' }
  6. If online:
       → Supabase insert both (wrap in try/catch — if leg 2 fails, leg 1 still persisted;
         transfer_group_id allows Phase 3 reconciliation to detect orphans)
  7. If offline:
       → LocalRepository.upsert both legs
       → SyncService.enqueueMutation for each (same transfer_group_id in payload)
  8. Telemetry: FINANCIAL_TRANSACTION_CREATED with is_transfer: true
```

**Partial sync risk**: If leg 1 syncs but leg 2 fails, the `transfer_group_id` links them. Phase 3 reconciliation will detect single-leg transfers and flag them. UI shows a warning icon on incomplete groups.

## File Changes

| File | Action | Description |
|---|---|---|
| `supabase/migrations/20260701100000_financial_transactions.sql` | Create | Table, indexes, RLS, triggers, RPCs, grants |
| `src/app-types/financial-transactions.ts` | Create | `FinancialTransaction`, DTOs, filter type |
| `src/app-types/financial-transactions.spec.ts` | Create | Type parity tests |
| `src/app-types/index.ts` | Modify | Barrel export |
| `src/app/core/services/financial-transactions/financial-transactions.ts` | Create | Offline-first CRUD + transfer logic |
| `src/app/core/services/financial-transactions/financial-transactions.spec.ts` | Create | Service unit tests |
| `src/app/core/services/sync/sync-service.ts` | Modify | Add `financial_transaction` case to `#buildRpcName()` |
| `src/app/core/services/sync/sync-service.spec.ts` | Modify | Add mapping tests |
| `src/app/core/services/telemetry/telemetry.types.ts` | Modify | Add `FINANCIAL_TRANSACTION_CREATED` |
| `src/app/features/financial/pages/transaction-list/transaction-list.page.ts` | Create | Container page |
| `src/app/features/financial/pages/transaction-list/transaction-list.page.html` | Create | Template |
| `src/app/features/financial/pages/transaction-list/transaction-list.page.scss` | Create | Styles |
| `src/app/features/financial/pages/transaction-list/transaction-list.page.spec.ts` | Create | Page unit tests |
| `src/app/features/financial/components/transaction-card/transaction-card.component.ts` | Create | Presentational card |
| `src/app/features/financial/components/transaction-card/transaction-card.component.html` | Create | Template |
| `src/app/features/financial/components/transaction-card/transaction-card.component.scss` | Create | Styles |
| `src/app/features/financial/components/transaction-card/transaction-card.component.spec.ts` | Create | Component unit tests |
| `src/app/features/financial/components/transaction-form-modal/transaction-form-modal.component.ts` | Create | Income/expense form |
| `src/app/features/financial/components/transaction-form-modal/transaction-form-modal.component.html` | Create | Template |
| `src/app/features/financial/components/transaction-form-modal/transaction-form-modal.component.scss` | Create | Styles |
| `src/app/features/financial/components/transaction-form-modal/transaction-form-modal.component.spec.ts` | Create | Component unit tests |
| `src/app/features/financial/components/transfer-form-modal/transfer-form-modal.component.ts` | Create | Transfer form |
| `src/app/features/financial/components/transfer-form-modal/transfer-form-modal.component.html` | Create | Template |
| `src/app/features/financial/components/transfer-form-modal/transfer-form-modal.component.scss` | Create | Styles |
| `src/app/features/financial/components/transfer-form-modal/transfer-form-modal.component.spec.ts` | Create | Component unit tests |
| `src/app/app.routes.ts` | Modify | Add `/financial/transactions` child route |
| `src/assets/i18n/es.json` | Modify | Add `financial.transactions.*` keys |
| `src/assets/i18n/en.json` | Modify | Add `financial.transactions.*` keys |

## Component Architecture

```
TransactionListPage (container)
├── ion-header: title + filter bar
│   ├── ion-select: account filter
│   ├── ion-select: category filter
│   ├── ion-select: status filter
│   └── ion-datetime: date range
├── ion-content
│   ├── ion-refresher
│   ├── ion-list
│   │   └── TransactionCard * N
│   │       ├── amount (colored by type)
│   │       ├── category icon + name
│   │       ├── date + description
│   │       ├── status badge
│   │       └── ion-item-options: complete / void
│   └── ion-infinite-scroll (load more)
├── ion-fab
│   ├── ion-fab-button: "New Income/Expense" → opens TransactionFormModal
│   └── ion-fab-button: "New Transfer" → opens TransferFormModal
├── TransactionFormModal (ion-modal)
│   └── Reactive form: type, account, category, amount, currency, exchange_rate, date, description, reference
└── TransferFormModal (ion-modal)
    └── Reactive form: source, destination, amount, currency, exchange_rate, date, description
```

## Testing Strategy

| Layer | What | Approach | Coverage Target |
|---|---|---|---|
| Unit — Types | Interface parity with DB schema | Compile-time checks + field assertions | 100% |
| Unit — Service | Online/offline fetch, create, transfer, status update, delete | Mock Supabase, NetworkStatusService, LocalRepository, SyncService. Verify BehaviorSubject emissions, cache writes, telemetry calls | 80%+ |
| Unit — Service | Transfer atomicity (two legs, shared group_id) | Verify both legs created with same `transfer_group_id`, correct types | 80%+ |
| Unit — Service | Status transition validation | Test all valid + invalid transitions | 80%+ |
| Unit — Service | Exchange rate validation | `exchange_rate > 0` when currency differs | 80%+ |
| Unit — SyncService | RPC mapping for `financial_transaction` | Verify `#buildRpcName` returns correct RPC names | 80%+ |
| Unit — TransactionListPage | Loading, empty, populated, error, filter states | TestBed with mock service, Transloco testing module | 70%+ |
| Unit — TransactionCard | Type-based styling, status badge colors, swipe actions | Input binding + DOM assertions | 70%+ |
| Unit — TransactionFormModal | Form validation, conditional exchange rate, submit | Reactive form assertions, mock service | 70%+ |
| Unit — TransferFormModal | Same-account rejection, destination exclusion, submit | Reactive form assertions | 70%+ |
| Unit — i18n | All `financial.transactions.*` keys resolve | Iterate keys, assert non-empty | 100% |

## Migration / Rollout

### Migration: `20260701100000_financial_transactions.sql`

Single additive migration — no existing tables altered. Structure:
1. Table creation with constraints
2. Timestamp trigger
3. Indexes (5 B-tree + 1 partial)
4. RLS policies (2: member SELECT, admin/operator ALL)
5. Terminal state guard trigger (`guard_terminal_transaction_status`)
6. Status transition validator trigger (`validate_status_transition`)
7. RPC functions: `soft_delete_financial_transaction`, `insert_financial_transaction_idempotent`, `update_financial_transaction_idempotent`
8. Grants

### Rollback

```sql
DROP TABLE IF EXISTS public.financial_transactions CASCADE;
DROP FUNCTION IF EXISTS public.soft_delete_financial_transaction;
DROP FUNCTION IF EXISTS public.insert_financial_transaction_idempotent;
DROP FUNCTION IF EXISTS public.update_financial_transaction_idempotent;
DROP FUNCTION IF EXISTS public.guard_terminal_transaction_status;
DROP FUNCTION IF EXISTS public.validate_status_transition;
```

Then remove:
- `financial_transaction` case from SyncService `#buildRpcName()`
- Feature UI components and route
- `FINANCIAL_TRANSACTION_CREATED` from telemetry types
- `financial-transactions` barrel export from `app-types/index.ts`

No downstream dependencies — Phase 3 (balance updates, double-entry) depends on this, but nothing depends on Phase 2 yet.

### Rollout Order

1. Migration (DB) — safe, additive
2. Types + barrel export — no runtime impact
3. SyncService mapping — no impact until mutations queued
4. Telemetry event — no consumers yet
5. Service — no UI consumers yet
6. UI components + route — feature goes live
7. i18n keys — required before UI renders

## Open Questions

- [ ] Should `base_amount` use a generated column (`GENERATED ALWAYS AS (amount * exchange_rate) STORED`) instead of denormalized? — Leaning denormalized for sync compatibility (offline writes need to set it directly).
- [ ] Should transfers be deletable as a pair (both legs) or individually? — Phase 2 allows individual soft-delete; Phase 3 reconciliation handles orphans.
