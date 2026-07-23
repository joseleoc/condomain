# Proposal: Basic Financial Transactions (Phase 2)

## Intent

Enable condominium administrators to **record financial transactions** (incomes, expenses, transfers) against existing wallets and categories. This phase builds the transaction recording layer — no balance updates or double-entry accounting yet (Phase 3). Transactions are persisted with offline-first sync and serve as the data foundation for the accounting engine.

## Scope

### In Scope
- `financial_transactions` table migration with RLS, indexes, soft delete (`deleted_at`)
- `FinancialTransaction` TypeScript interface + barrel export
- `FinancialTransactionsService` — offline-first CRUD mirroring `CondominiumAccounts` pattern
- Status lifecycle: `pending` → `completed` → `voided` (terminal states immutable)
- `TransactionListPage` — container with filters (account, category, date range, status)
- `TransactionCard` — presentational component (amount, category icon, date, description, status badge)
- `TransactionFormModal` — income/expense form (wallet, category, amount, currency, date, description, reference)
- `TransferFormModal` — transfer form (source wallet, destination wallet, amount, date, description)
- Lazy route: `/financial/transactions`
- SyncService RPC mappings for `financial_transaction` entity type
- 1 telemetry event: `FINANCIAL_TRANSACTION_CREATED`
- Unit tests: services 80%+, components 70%+

### Out of Scope
- Balance updates on wallet `current_balance` (Phase 3)
- Double-entry accounting engine / journal entries (Phase 3)
- Transaction approval workflow (Phase 4)
- Recurring transactions, attachments, batch import
- Exchange rate API integration (rate is manually entered for now)

## Capabilities

### New Capabilities
- `financial-transactions`: Transaction CRUD, status lifecycle (pending→completed→voided), multi-currency capture (original_currency + exchange_rate), offline-first sync, filterable list UI, income/expense/transfer form modals

### Modified Capabilities
None — `openspec/specs/` has no existing specs.

## Approach

Follow Phase 1 patterns exactly:
- **Service**: `@Injectable({ providedIn: 'root' })`, `inject()` DI, BehaviorSubjects (`transactions$`, `loading$`, `error$`), offline-first via `LocalRepository` + `SyncService`
- **SyncService**: Add `financial_transaction` case to `#buildRpcName()` mapping to `insert_financial_transaction_idempotent`, `update_financial_transaction_idempotent`, `soft_delete_financial_transaction`
- **Types**: `src/app-types/financial-transactions.ts` with `FinancialTransaction`, `CreateFinancialTransactionData`, `TransactionType`, `TransactionStatus` unions
- **Feature UI**: Extend `src/app/features/financial/` with transaction pages/components under container-presentational split
- **Transfers**: Create two linked transactions (expense from source, income to destination) sharing a `transfer_group_id` UUID
- **i18n**: Transloco keys under `financial.transactions.*`
- **Testing**: TDD — Jasmine + Karma, spec files first

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | `financial_transactions` table, indexes, RLS, RPC functions |
| `src/app-types/financial-transactions.ts` | New | Transaction interfaces + DTOs |
| `src/app-types/index.ts` | Modified | Barrel export |
| `src/app/core/services/financial-transactions/` | New | Offline-first CRUD service + spec |
| `src/app/core/services/sync/sync-service.ts` | Modified | Add `financial_transaction` RPC mappings |
| `src/app/core/services/telemetry/telemetry.types.ts` | Modified | `FINANCIAL_TRANSACTION_CREATED` event |
| `src/app/features/financial/pages/transaction-list/` | New | Container page with filters |
| `src/app/features/financial/components/transaction-card/` | New | Presentational card |
| `src/app/features/financial/components/transaction-form-modal/` | New | Income/expense form |
| `src/app/features/financial/components/transfer-form-modal/` | New | Transfer form |
| `src/app/app.routes.ts` | Modified | Add `/financial/transactions` route |
| `src/assets/i18n/{en,es}.json` | Modified | Transaction UI strings |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Transfer atomicity — partial sync (one leg synced, other fails) | Med | `transfer_group_id` links both legs; UI shows incomplete transfers; Phase 3 reconciliation handles orphans |
| Status mutation on terminal state (completed/voided) | Low | DB trigger rejects UPDATE on terminal rows + service-level guard |
| Large transaction lists degrade scroll performance | Med | Paginated queries (limit 50) + virtual scroll in Phase 3 if needed |
| Exchange rate stored incorrectly for multi-currency | Low | Service validates `exchange_rate > 0` when `original_currency ≠ base_currency` |

## Rollback Plan

1. `DROP TABLE IF EXISTS financial_transactions;` + drop RPC functions
2. Remove `financial_transaction` case from SyncService `#buildRpcName()`
3. Remove feature UI components and route — no downstream dependencies
4. Remove telemetry event — no consumers yet

## Dependencies

- Phase 1 (`financial-wallets-categories`) complete — wallets and categories exist for FK references
- `CondominiumAccounts` service for wallet selection in forms
- `TransactionCategories` service for category selection in forms
- Existing `SyncService` / `LocalRepository` / `SyncOrchestrator`
- `ContextService` for active `condominium_id`

## Success Criteria

- [ ] Admin can create income transactions (wallet + income category + amount + date)
- [ ] Admin can create expense transactions (wallet + expense category + amount + date + reference)
- [ ] Admin can create transfers between two wallets (source → destination)
- [ ] All new transactions default to `pending` status
- [ ] Transaction list filters by account, category, date range, and status
- [ ] Offline-created transactions sync correctly when back online
- [ ] Status transitions enforced: pending→completed, pending→voided, completed→voided only
- [ ] Telemetry fires `FINANCIAL_TRANSACTION_CREATED` on creation
- [ ] Services 80%+ test coverage, components 70%+
