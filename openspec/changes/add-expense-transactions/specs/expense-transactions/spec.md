# Expense Transactions Specification

## Purpose

Defines the expense transaction creation flow: a dedicated `ExpensesService` facade, form/modal/list UI components, offline-first sync, automatic double-entry accounting via DB triggers, and i18n keys. Expenses use the existing `financial_transactions` table with `type='expense'`.

## Requirements

### Requirement: `ExpensesService`

`@Injectable({ providedIn: 'root' })`, `inject()` DI. Wraps `FinancialTransactions` service for expense-specific operations.

Deps: `FinancialTransactions`, `CondominiumAccounts`, `TransactionCategories`, `NetworkStatusService`, `ContextService`.

State: `expenses$` (BehaviorSubject), `loading$`, `error$`.

| Method | Behavior |
|--------|----------|
| `createExpense(data)` | Calls `FinancialTransactions.create({ ...data, type: 'expense' })`. Online: insert + cache + telemetry. Offline: local UUID + `_local_status:'pending'` + enqueue mutation. |
| `fetchExpensesByCondominium(id)` | Calls `FinancialTransactions.fetchByCondominium(id, { type: 'expense' })`. Updates `expenses$`. |
| `getExpenseAccountName(accountId)` | Looks up account name from `CondominiumAccounts.accounts$` cache. |

After successful creation, the service MUST refresh the wallet cache (`CondominiumAccounts.fetchByCondominium`) so the updated balance is reflected.

#### Scenario: Create expense online
- GIVEN user is online, valid expense data
- WHEN `createExpense(data)` called
- THEN `FinancialTransactions.create()` inserts row with `type='expense'`, `expenses$` updated, telemetry tracked

#### Scenario: Create expense offline
- GIVEN user is offline
- WHEN `createExpense(data)` called
- THEN local row created with `_local_status:'pending'`, mutation enqueued in SyncService, expense appears in `expenses$`

#### Scenario: Wallet cache refreshed after creation
- GIVEN expense created successfully
- THEN `CondominiumAccounts.fetchByCondominium()` called to refresh wallet balances

---

### Requirement: `ExpenseFormComponent`

Standalone component. Reactive form with `ControlContainer` for parent binding.

| Field | Validation |
|-------|-----------|
| `account_id` | Required |
| `category_id` | Required, filtered by `category_type='expense'` |
| `amount` | Required, min 0.01 |
| `original_currency` | Required, default: condo base currency |
| `exchange_rate` | Required when `original_currency ≠ base_currency`, min 0.0001 |
| `description` | Optional |
| `reference_number` | Optional |
| `transaction_date` | Required, MUST NOT be future-dated |

Outputs: `formSubmit` (emits form value), `cancelled` (emits void).

Category dropdown MUST only show categories where `category_type='expense'` (via `TransactionCategories.fetchByType(condoId, 'expense')`).

Exchange rate field MUST be visible only when `original_currency` differs from the condominium's base currency.

`base_amount` = `amount * exchange_rate` (calculated client-side for display; DB trigger is source of truth).

#### Scenario: Category filtering
- GIVEN form opened
- WHEN category dropdown populated
- THEN only categories with `category_type='expense'` are shown

#### Scenario: Exchange rate conditional visibility
- GIVEN `original_currency` differs from base currency
- THEN exchange rate field is visible and required
- GIVEN `original_currency` equals base currency
- THEN exchange rate field hidden, rate defaults to 1.0

#### Scenario: Future date rejected
- GIVEN `transaction_date` is tomorrow
- WHEN form submitted
- THEN validation error shown, form not submitted

#### Scenario: Valid form submission
- GIVEN all required fields valid
- WHEN submit clicked
- THEN `formSubmit` emitted with form value

---

### Requirement: `ExpenseFormModalComponent`

Standalone component. Wraps `ExpenseFormComponent` in an Ionic modal.

On submit: calls `ExpensesService.createExpense()`. On success: shows success toast, closes modal, resets form. On error: shows error toast, keeps modal open, preserves form input.

Error handling:
- Postgres error code `23505` (unique violation on `reference_number`): show "Duplicate reference number" message.
- Other errors: show generic "Failed to create expense" message.

#### Scenario: Successful creation
- GIVEN valid form, user submits
- WHEN `createExpense()` resolves
- THEN success toast shown, modal closed, form reset

#### Scenario: Duplicate reference number
- GIVEN user enters existing reference number
- WHEN `createExpense()` rejects with code `23505`
- THEN error toast shows "Duplicate reference number", modal stays open, form preserved

#### Scenario: Generic error
- GIVEN network failure during creation
- WHEN `createExpense()` rejects
- THEN error toast shows "Failed to create expense", modal stays open

---

### Requirement: `ExpenseListComponent`

Standalone component. Subscribes to `ExpensesService.expenses$`.

Display per expense: account name (via `getExpenseAccountName()`), category name, amount (2 decimals + currency symbol), date (locale string), sync status icon.

Sync status: `_local_status='pending'` → pending sync icon; otherwise → completed icon.

States: loading (spinner), empty (message + create button), populated (list).

#### Scenario: Populated state
- GIVEN 5 expenses in `expenses$`
- THEN 5 items rendered with account names, amounts, dates

#### Scenario: Empty state
- GIVEN 0 expenses
- THEN empty message displayed with "Create expense" button

#### Scenario: Loading state
- GIVEN `loading$` is true
- THEN spinner shown, no list items

#### Scenario: Pending sync indicator
- GIVEN expense with `_local_status='pending'`
- THEN pending sync icon displayed next to expense

---

### Requirement: DB Trigger Integration

No manual accounting entry creation in client code. DB triggers handle:

| Trigger | Action |
|---------|--------|
| `trg_generate_accounting_entries` | On INSERT: creates debit (expense category account) + credit (wallet account) entries automatically |
| `trg_update_wallet_balance_on_insert` | On INSERT when `status='completed'`: deducts `base_amount` from wallet `current_balance` |

Expenses created online start with `status='completed'`. Wallet balance decreases immediately on insert via trigger.

#### Scenario: Accounting entries created automatically
- GIVEN expense inserted with `status='completed'`
- THEN `trg_generate_accounting_entries` creates: debit to expense category account, credit to wallet account

#### Scenario: Wallet balance decreases on insert
- GIVEN expense inserted with `status='completed'`
- THEN `trg_update_wallet_balance_on_insert` deducts `base_amount` from wallet immediately

---

### Requirement: i18n Keys

Add under `financial.transactions.toast.*` (reuse existing namespace):

| Key | EN | ES |
|-----|----|----|
| `expenseCreated` | "Expense created successfully" | "Gasto creado exitosamente" |
| `expenseCreateError` | "Failed to create expense" | "Error al crear el gasto" |
| `duplicateReferenceNumber` | "Duplicate reference number" | "Número de referencia duplicado" |

Add under `validation.*` (if not present):

| Key | EN | ES |
|-----|----|----|
| `futureDate` | "Date cannot be in the future" | "La fecha no puede ser futura" |
| `minAmount` | "Minimum amount is 0.01" | "El monto mínimo es 0.01" |

#### Scenario: EN keys resolve
- GIVEN `en.json` loaded
- THEN all expense keys resolve to English strings

#### Scenario: ES keys resolve
- GIVEN `es.json` loaded
- THEN all expense keys resolve to Spanish strings

---

### Requirement: Integration Points

| Integration | Detail |
|-------------|--------|
| Transaction list page | Add "New expense" button (opens `ExpenseFormModal`). Reuse existing FAB/button if present. |
| `TransactionCategories` | Use `fetchByType(condoId, 'expense')` for category dropdown |
| `CondominiumAccounts` | Use `accounts$` for wallet dropdown and account name lookup |
| `Currency` | Use existing currency list for currency selector |
| `SyncService` | Entity type `'financial_transaction'`, RPC mappings already exist |

#### Scenario: Expense button opens modal
- GIVEN user on transaction list page
- WHEN "New expense" button clicked
- THEN `ExpenseFormModalComponent` opens

#### Scenario: Offline expense syncs when online
- GIVEN expense created offline with `_local_status:'pending'`
- WHEN device comes online and SyncService processes queue
- THEN expense synced to Supabase, `_local_status` removed, `status` updated
