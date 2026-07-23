# Financial Transactions — Service, UI & Telemetry Specification

## Purpose

Defines the `FinancialTransactions` offline-first CRUD service, transfer logic, UI components, routing, i18n keys, and telemetry event. Covers all client-side behavior for recording and displaying transactions.

## Requirements

### Requirement: TypeScript Interfaces

`FinancialTransaction` in `src/app-types/financial-transactions.ts`, exported via `index.ts`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID |
| `condominium_id` | `string` | FK |
| `account_id` | `string` | Source/target wallet |
| `category_id` | `string \| null` | Null for transfers |
| `transaction_type` | `'income' \| 'expense' \| 'transfer'` | Union literal |
| `status` | `'pending' \| 'completed' \| 'voided'` | Default `'pending'` |
| `amount` | `number` | Original currency amount |
| `original_currency` | `string` | ISO 4217 |
| `exchange_rate` | `number` | Default 1.0 |
| `base_amount` | `number` | `amount * exchange_rate` |
| `description` | `string \| null` | |
| `reference` | `string \| null` | Check #, receipt #, etc. |
| `transaction_date` | `string` | ISO date `YYYY-MM-DD` |
| `transfer_group_id` | `string \| null` | Links transfer pair |
| `created_at` / `updated_at` | `string` | ISO timestamps |
| `deleted_at` | `string \| null` | Soft delete |

DTOs:
- `CreateFinancialTransactionData = Pick<FinancialTransaction, 'condominium_id' | 'account_id' | 'category_id' | 'transaction_type' | 'amount' | 'original_currency' | 'exchange_rate' | 'description' | 'reference' | 'transaction_date'>`
- `CreateTransferData = { condominium_id, source_account_id, destination_account_id, amount, original_currency, exchange_rate, description, transaction_date }`
- `UpdateFinancialTransactionData = Partial<Pick<...>>` (editable fields only)
- `TransactionFilter = { account_id?, category_id?, status?, date_from?, date_to? }`

#### Scenario: Type parity
- GIVEN interface vs DB schema comparison
- THEN all columns match with correct nullability

---

### Requirement: `FinancialTransactions` Service

`@Injectable({ providedIn: 'root' })`, `inject()` DI. Deps: `Supabase`, `NetworkStatusService`, `LocalRepository`, `SyncService`, `TelemetryService`.

State: `BehaviorSubject<FinancialTransaction[]>`, `loading$`, `error$`.

| Method | Online | Offline |
|--------|--------|---------|
| `fetchByCondominium(id, filter?)` | Supabase query with filters, cache each via `upsert('financial_transaction', ...)` | `getEntitiesByType('financial_transaction')`, filter by condo + filter criteria |
| `getById(id)` | Supabase `.single()`, cache | `getById('financial_transaction', id)` |
| `create(data)` | Supabase insert, cache, telemetry | UUID + `_local_status:'pending'`, enqueue |
| `createTransfer(data)` | Generate `transfer_group_id`, create TWO transactions (expense from source, income to dest), cache both, telemetry | Generate UUIDs, enqueue both mutations |
| `updateStatus(id, newStatus)` | Validate transition, Supabase update, cache | Enqueue status update |
| `delete(id)` | Optimistic `deleted_at` → RPC `soft_delete_financial_transaction`. Revert on error | Optimistic → enqueue |

#### Scenario: Fetch with filters
- GIVEN online, filter `{ status: 'pending', account_id: 'a1' }`
- WHEN `fetchByCondominium('c1', filter)` called
- THEN Supabase query includes `eq('status', 'pending').eq('account_id', 'a1')`, results cached

#### Scenario: Create income online
- GIVEN online, `create({ transaction_type: 'income', amount: 100, ... })`
- THEN Supabase insert, row cached, `FINANCIAL_TRANSACTION_CREATED` fired

#### Scenario: Create expense offline
- GIVEN offline, `create({ transaction_type: 'expense', ... })`
- THEN local row with `_local_status: 'pending'`, mutation enqueued

#### Scenario: Create transfer online
- GIVEN online, `createTransfer({ source_account_id: 'a1', destination_account_id: 'a2', amount: 50, ... })`
- THEN `transfer_group_id` generated, expense from a1 inserted, income to a2 inserted, both share `transfer_group_id`

#### Scenario: Create transfer offline
- GIVEN offline, `createTransfer(...)` called
- THEN two local rows created with shared `transfer_group_id`, two mutations enqueued

#### Scenario: Status transition valid
- GIVEN `status = 'pending'`
- WHEN `updateStatus(id, 'completed')`
- THEN Supabase update, cache updated

#### Scenario: Status transition invalid
- GIVEN `status = 'voided'`
- WHEN `updateStatus(id, 'pending')`
- THEN error thrown, no mutation

#### Scenario: Delete reverts on error
- GIVEN online, Supabase RPC returns error
- THEN local cache reverted, error thrown

---

### Requirement: Transfer Implementation Strategy

Transfers create TWO linked transactions sharing a `transfer_group_id` (UUID v4):

1. **Expense leg**: `transaction_type = 'expense'`, `account_id = source_account_id`, `category_id = null`, negative impact on source wallet.
2. **Income leg**: `transaction_type = 'income'`, `account_id = destination_account_id`, `category_id = null`, positive impact on destination wallet.

Both legs share: `amount`, `original_currency`, `exchange_rate`, `base_amount`, `description`, `transaction_date`, `transfer_group_id`.

The service MUST create both legs atomically when online (single transaction block). When offline, both mutations are enqueued with the same `transfer_group_id` for reconciliation.

#### Scenario: Transfer legs share group ID
- GIVEN `createTransfer({ source: 'a1', dest: 'a2', amount: 50 })`
- WHEN both legs created
- THEN expense leg `transfer_group_id = income leg transfer_group_id`

#### Scenario: Transfer legs have correct types
- GIVEN transfer from a1 to a2
- THEN source leg is `expense` on a1, dest leg is `income` on a2

#### Scenario: Transfer amount validation
- GIVEN `amount <= 0`
- WHEN `createTransfer` called
- THEN error thrown before any mutation

#### Scenario: Transfer same account rejected
- GIVEN `source_account_id = destination_account_id`
- WHEN `createTransfer` called
- THEN error "Source and destination must differ"

---

### Requirement: TransactionListPage

Container component at `src/app/features/financial/pages/transaction-list/`.

Responsibilities:
- Fetch transactions on init via `FinancialTransactions.fetchByCondominium()`.
- Display filter bar: account selector, category selector, date range, status dropdown.
- Render `TransactionCard` for each transaction.
- Handle loading, empty, error states.
- FAB buttons: "New Income/Expense" (opens `TransactionFormModal`), "New Transfer" (opens `TransferFormModal`).
- Pull-to-refresh via `ion-refresher`.
- Paginated: `LIMIT 50`, load more on scroll.

#### Scenario: Populated state
- GIVEN 10 transactions returned
- THEN 10 `TransactionCard` components rendered

#### Scenario: Empty state
- GIVEN 0 transactions
- THEN empty message + "Create Transaction" button

#### Scenario: Loading state
- GIVEN `loading$` is true
- THEN `ion-spinner` shown, no cards

#### Scenario: Filter applied
- GIVEN user selects status = 'pending'
- WHEN filter changes
- THEN `fetchByCondominium` re-called with filter, list updates

#### Scenario: Pull to refresh
- GIVEN user pulls down
- WHEN `ion-refresher` triggers
- THEN `fetchByCondominium` re-called, spinner shown until complete

---

### Requirement: TransactionCard

Presentational component at `src/app/features/financial/components/transaction-card/`.

Inputs: `transaction: FinancialTransaction`.
Outputs: `statusChange: EventEmitter<{id, newStatus}>`.

Display:
- Amount (formatted with currency symbol, colored: green for income, red for expense, blue for transfer).
- Category icon + name (or "Transfer" label for transfers).
- Date (formatted).
- Description (truncated).
- Status badge (`pending` = yellow, `completed` = green, `voided` = gray).
- Swipe actions: complete, void (context-dependent based on current status).

#### Scenario: Income card styling
- GIVEN `transaction_type = 'income'`, `amount = 100`, `currency = 'USD'`
- THEN amount displayed as "+$100.00" in green

#### Scenario: Expense card styling
- GIVEN `transaction_type = 'expense'`, `amount = 50`
- THEN amount displayed as "-$50.00" in red

#### Scenario: Transfer card styling
- GIVEN `transaction_type = 'transfer'`
- THEN amount displayed in blue, category shows "Transfer" label

#### Scenario: Status badge colors
- GIVEN `status = 'pending'`
- THEN yellow badge
- GIVEN `status = 'completed'`
- THEN green badge
- GIVEN `status = 'voided'`
- THEN gray badge

#### Scenario: Swipe actions by status
- GIVEN `status = 'pending'`
- THEN swipe shows "Complete" and "Void" options
- GIVEN `status = 'completed'`
- THEN swipe shows "Void" only
- GIVEN `status = 'voided'`
- THEN no swipe actions

---

### Requirement: TransactionFormModal

Modal component at `src/app/features/financial/components/transaction-form-modal/`.

Opens for income or expense creation/editing.

Form fields:
- `transaction_type`: income | expense (selector, disabled on edit).
- `account_id`: wallet selector (dropdown populated from `CondominiumAccounts`).
- `category_id`: category selector (filtered by `transaction_type`, from `TransactionCategories`).
- `amount`: numeric input, MUST be > 0.
- `original_currency`: currency selector (default: condo base currency).
- `exchange_rate`: numeric input, default 1.0, MUST be > 0. Shown only when `original_currency ≠ base_currency`.
- `transaction_date`: date picker, default today.
- `description`: text input, optional.
- `reference`: text input, optional (check #, receipt #).

Validation:
- `amount` required, > 0.
- `account_id` required.
- `category_id` required for income/expense (not for transfers).
- `exchange_rate` required and > 0 when `original_currency ≠ base_currency`.
- `transaction_date` required, not future-dated.

On submit: calls `FinancialTransactions.create()` or `update()`, closes modal, shows toast.

#### Scenario: Income form valid submit
- GIVEN all fields valid
- WHEN submit
- THEN `create()` called with `transaction_type: 'income'`, modal closes, toast shown

#### Scenario: Expense form missing category
- GIVEN `category_id` is null
- WHEN submit
- THEN validation error, no submit

#### Scenario: Exchange rate shown conditionally
- GIVEN `original_currency` differs from base currency
- THEN exchange rate field visible
- GIVEN `original_currency` equals base currency
- THEN exchange rate field hidden, rate defaults to 1.0

#### Scenario: Future date rejected
- GIVEN `transaction_date` is tomorrow
- WHEN submit
- THEN validation error "Date cannot be in the future"

---

### Requirement: TransferFormModal

Modal component at `src/app/features/financial/components/transfer-form-modal/`.

Form fields:
- `source_account_id`: wallet selector (dropdown).
- `destination_account_id`: wallet selector (dropdown, excludes source).
- `amount`: numeric input, MUST be > 0.
- `original_currency`: currency selector (default: base currency).
- `exchange_rate`: numeric, default 1.0.
- `transaction_date`: date picker, default today.
- `description`: text, optional.

Validation:
- Both accounts required and MUST differ.
- `amount` > 0.
- `transaction_date` not future.

On submit: calls `FinancialTransactions.createTransfer()`, closes modal, toast.

#### Scenario: Valid transfer submit
- GIVEN source ≠ destination, amount > 0
- WHEN submit
- THEN `createTransfer()` called, modal closes, toast shown

#### Scenario: Same account rejected
- GIVEN source = destination
- WHEN submit
- THEN validation error, no submit

#### Scenario: Destination excludes source
- GIVEN source = 'a1' selected
- THEN destination dropdown does not show 'a1'

---

### Requirement: Telemetry

Add `FINANCIAL_TRANSACTION_CREATED: 'financial_transaction_created'` to `TelemetryEvents`.

`create()` and `createTransfer()` call `TelemetryService.track()` with properties:
- `transaction_type`: income | expense | transfer
- `amount`: number
- `currency`: string
- `condominium_id`: string
- `is_transfer`: boolean
- `has_exchange_rate`: boolean (true if `exchange_rate !== 1.0`)

#### Scenario: Track income creation
- GIVEN income created
- THEN event fired with `transaction_type: 'income'`, amount, currency, condo_id

#### Scenario: Track transfer creation
- GIVEN transfer created
- THEN event fired with `transaction_type: 'transfer'`, `is_transfer: true`

---

### Requirement: Routes

Lazy-load in `app.routes.ts` under `isNotAuthenticatedGuard`:

```
/financial/transactions → TransactionListPage via loadComponent()
```

Added as child of existing `/financial` route group.

#### Scenario: Route resolves
- GIVEN authenticated user navigates to `/financial/transactions`
- THEN `TransactionListPage` lazy-loaded

---

### Requirement: SyncService RPC Mappings

Add `financial_transaction` case to `#buildRpcName()`:

| mutation_type | RPC name |
|---------------|----------|
| `create` | `insert_financial_transaction_idempotent` |
| `update` | `update_financial_transaction_idempotent` |
| `delete` | `soft_delete_financial_transaction` |

Sync entity type: `'financial_transaction'`.

#### Scenario: Create mutation maps correctly
- GIVEN `enqueueMutation('create', 'financial_transaction', ...)`
- WHEN `#buildRpcName` called
- THEN returns `'insert_financial_transaction_idempotent'`

#### Scenario: Delete mutation maps correctly
- GIVEN `enqueueMutation('delete', 'financial_transaction', ...)`
- WHEN `#buildRpcName` called
- THEN returns `'soft_delete_financial_transaction'`

---

### Requirement: i18n Keys

Transloco keys under `financial.transactions.*` in both `es.json` and `en.json`:

```
financial.transactions.title
financial.transactions.emptyList
financial.transactions.createButton
financial.transactions.transferButton
financial.transactions.filter.account
financial.transactions.filter.category
financial.transactions.filter.status
financial.transactions.filter.dateFrom
financial.transactions.filter.dateTo
financial.transactions.form.titleIncome
financial.transactions.form.titleExpense
financial.transactions.form.titleTransfer
financial.transactions.form.type
financial.transactions.form.account
financial.transactions.form.sourceAccount
financial.transactions.form.destinationAccount
financial.transactions.form.category
financial.transactions.form.amount
financial.transactions.form.currency
financial.transactions.form.exchangeRate
financial.transactions.form.date
financial.transactions.form.description
financial.transactions.form.reference
financial.transactions.form.save
financial.transactions.form.cancel
financial.transactions.status.pending
financial.transactions.status.completed
financial.transactions.status.voided
financial.transactions.toast.created
financial.transactions.toast.statusUpdated
financial.transactions.toast.deleted
financial.transactions.toast.error
financial.transactions.validation.amountRequired
financial.transactions.validation.amountPositive
financial.transactions.validation.accountRequired
financial.transactions.validation.categoryRequired
financial.transactions.validation.dateNotFuture
financial.transactions.validation.accountsDiffer
financial.transactions.validation.exchangeRatePositive
```

#### Scenario: ES keys present
- GIVEN `es.json` loaded
- THEN all `financial.transactions.*` keys resolve to Spanish strings

#### Scenario: EN keys present
- GIVEN `en.json` loaded
- THEN all `financial.transactions.*` keys resolve to English strings
