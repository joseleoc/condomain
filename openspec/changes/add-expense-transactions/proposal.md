# Proposal: Add Expense Transactions

## Intent

Enable condominium administrators to **record expense transactions** following the same pattern as incomes. Expenses automatically deduct from wallet balances and create double-entry accounting records via existing database triggers. This completes the basic transaction recording layer (incomes + expenses) before transfers.

## Scope

### In Scope
- `ExpensesService` — offline-first CRUD mirroring `IncomesService` pattern
- `ExpenseFormComponent` — reactive form filtering categories by `category_type='expense'`
- `ExpenseFormModalComponent` — modal wrapper calling service with success/error toasts
- `ExpenseListComponent` — displays expenses with account names and sync status
- i18n keys for expense-related UI (en/es)
- Integration into transaction list page (expense creation button)
- Unit tests: service 80%+, components 70%+

### Out of Scope
- Expense approval workflow (future phase)
- Recurring expenses, attachments, batch import
- Expense reporting or analytics
- Transfer transactions (separate change)

## Capabilities

### New Capabilities
- `expense-transactions`: Expense creation (online/offline), category filtering by type='expense', automatic wallet deduction via DB trigger, double-entry accounting via DB trigger, offline sync queue support

### Modified Capabilities
None — existing `financial-transactions` capability remains unchanged. Expenses use the same `financial_transactions` table with `type='expense'`.

## Approach

Mirror the income implementation exactly:
- **Service**: `@Injectable({ providedIn: 'root' })`, `inject()` DI, BehaviorSubjects (`expenses$`, `loading$`, `error$`), offline-first via `LocalRepository` + `SyncService`
- **Form**: Reactive form with validation, filters `TransactionCategories` by `category_type='expense'`, shows exchange rate field when currency differs from base
- **Modal**: Wraps form, calls `ExpensesService.createExpense()`, handles duplicate reference errors (code `23505`)
- **List**: Displays expenses with account names, sync status icons, formatted dates/amounts
- **DB Integration**: No manual accounting entry creation — triggers handle:
  - `generate_accounting_entries()` creates debit (expense category) + credit (wallet)
  - `update_wallet_balance_on_insert()` deducts from wallet when `status='completed'`
- **i18n**: Transloco keys under `home.expense*` and `validation.*`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/core/services/expenses/` | New | `ExpensesService` + spec (mirror IncomesService) |
| `src/app/shared/components/forms/expense-form/` | New | Form component + HTML + SCSS + spec |
| `src/app/shared/components/modals/expense-form-modal/` | New | Modal wrapper + HTML + SCSS + spec |
| `src/app/shared/components/expense-list/` | New | List component + HTML + SCSS + spec |
| `src/assets/i18n/en.json` | Modified | Add `expenseCreated`, `expenseCreateError`, `duplicateReferenceNumber` keys |
| `src/assets/i18n/es.json` | Modified | Add Spanish translations for expense keys |
| Transaction list page | Modified | Add expense creation button (if not already present) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Expense categories don't exist in DB | Low | Seed data or migration must include expense categories before testing |
| Wallet balance not updating correctly | Low | DB trigger `update_wallet_balance_on_insert()` already tested; verify with integration test |
| Offline expense sync fails | Med | SyncService already handles `financial_transaction` entity; same RPC mappings apply |
| Exchange rate validation differs from incomes | Low | Reuse exact same validation logic from IncomeFormComponent |

## Rollback Plan

1. Remove `ExpensesService` and all expense components
2. Remove i18n keys for expenses
3. Remove expense creation button from transaction list page
4. No database changes to rollback (uses existing `financial_transactions` table)

## Dependencies

- `IncomesService` pattern (already implemented)
- `TransactionCategories` service with expense categories in DB
- `CondominiumAccounts` service for wallet selection
- Existing `SyncService` / `LocalRepository` infrastructure
- DB triggers `generate_accounting_entries()` and `update_wallet_balance_on_insert()` (already exist)

## Success Criteria

- [ ] Admin can create expense transactions (wallet + expense category + amount + date + reference)
- [ ] Expense categories filtered correctly in form (only `category_type='expense'`)
- [ ] Expenses automatically create accounting entries (debit expense, credit wallet) via DB trigger
- [ ] Wallet balances decrease correctly when expense status='completed' via DB trigger
- [ ] Offline-created expenses sync correctly when back online
- [ ] Expenses appear in transaction lists with proper formatting
- [ ] Duplicate reference number errors handled with user-friendly message
- [ ] Service 80%+ test coverage, components 70%+
- [ ] All i18n keys present in both en.json and es.json
