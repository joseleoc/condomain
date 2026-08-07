# Design: Add Expense Transactions

## Technical Approach

Expenses reuse the `financial_transactions` table with `type='expense'`. An `ExpensesService` wraps `FinancialTransactions` for expense-specific operations (state, wallet refresh, account name resolution), while form/modal/list components follow existing Ionic standalone patterns. DB triggers handle accounting entries and wallet deduction automatically — zero manual accounting in client code.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Service layer | `ExpensesService` mirrors `IncomesService` exactly | Uses Supabase client directly (not FinancialTransactions wrapper), same online/offline pattern with LocalRepository + SyncService |
| Component model | Standalone, `inject()`, signals+BehaviorSubjects | Matches project convention (no NgModules) |
| Online expense status | `status='completed'` | Immediate wallet deduction via DB trigger `trg_update_wallet_balance_on_insert` (mirrors IncomesService) |
| Offline expense status | `status='pending'`, `_local_status='pending'` | SyncService queue handles sync; trigger fires only after sync promotes to 'completed' |

## Data Flow

```
User fills form → ExpenseFormModalComponent
  → ExpensesService.createExpense(data)
    ONLINE: Supabase INSERT with status='completed'
      → DB triggers fire automatically:
        trg_generate_accounting_entries → debit(category) + credit(wallet)
        trg_update_wallet_balance_on_insert → deducts wallet.current_balance
      → LocalRepository.upsert (cache locally)
      → CondominiumAccounts.fetchByCondominium() (refresh wallet cache)
      → TelemetryService.track()
    OFFLINE: Local UUID + status='pending' + _local_status:'pending'
      → LocalRepository.upsert
      → SyncService.enqueueMutation
      → CondominiumAccounts.fetchByCondominium() (refresh from cache)
  → Toast (success/error) + modal close
```

## File Structure

| File | Action |
|------|--------|
| `src/app/core/services/expenses/expenses.service.ts` | Create |
| `src/app/core/services/expenses/expenses.service.spec.ts` | Create |
| `src/app/shared/components/forms/expense-form/expense-form.component.ts` | Create |
| `src/app/shared/components/forms/expense-form/expense-form.component.html` | Create |
| `src/app/shared/components/forms/expense-form/expense-form.component.scss` | Create |
| `src/app/shared/components/forms/expense-form/expense-form.component.spec.ts` | Create |
| `src/app/shared/components/modals/expense-form-modal/expense-form-modal.component.ts` | Create |
| `src/app/shared/components/modals/expense-form-modal/expense-form-modal.component.html` | Create |
| `src/app/shared/components/modals/expense-form-modal/expense-form-modal.component.spec.ts` | Create |
| `src/app/shared/components/expense-list/expense-list.component.ts` | Create |
| `src/app/shared/components/expense-list/expense-list.component.html` | Create |
| `src/app/shared/components/expense-list/expense-list.component.scss` | Create |
| `src/app/shared/components/expense-list/expense-list.component.spec.ts` | Create |
| `src/assets/i18n/en.json` | Modify |
| `src/assets/i18n/es.json` | Modify |

## Interface Definitions

`CreateExpenseData` (service layer — subset of `CreateFinancialTransactionData`):

```typescript
export interface CreateExpenseData {
  condominium_id: string;
  account_id: string;
  category_id: string;      // required, filtered by category_type='expense'
  amount: number;
  original_currency: string;
  exchange_rate?: number;   // required when currency ≠ base
  description: string;      // defaults to '' if empty
  reference_number?: string | null;
  transaction_date: string;
}
```

`ExpenseFormValue` (form output — mirrors form fields):

```typescript
export interface ExpenseFormValue {
  account_id: string;
  category_id: string;
  amount: number;
  original_currency: string;
  exchange_rate: number;
  description: string;
  reference_number: string;
  transaction_date: string;
}
```

## Service Design: `ExpensesService`

```typescript
@Injectable({ providedIn: 'root' })
// Dependencies (inject())
Supabase (client), NetworkStatusService, LocalRepository, SyncService,
TelemetryService, Profile, ContextService, CondominiumAccounts

// State (BehaviorSubjects)
expenses$: BehaviorSubject<FinancialTransaction[]>
loading$: BehaviorSubject<boolean>
error$: BehaviorSubject<unknown>

// Methods
createExpense(data: CreateExpenseData): Promise<FinancialTransaction>
  → Online: Supabase INSERT with status='completed' → DB triggers fire
    → trg_generate_accounting_entries → debit(category) + credit(wallet)
    → trg_update_wallet_balance_on_insert → deducts wallet.current_balance
    → LocalRepository.upsert (cache)
    → CondominiumAccounts.fetchByCondominium() (refresh wallet cache)
    → TelemetryService.track()
  → Offline: Local UUID + status='pending' + _local_status:'pending'
    → LocalRepository.upsert
    → SyncService.enqueueMutation
    → CondominiumAccounts.fetchByCondominium() (refresh from cache)

fetchExpensesByCondominium(condoId: string): Promise<FinancialTransaction[]>
  → Online: Supabase SELECT with type='expense' → LocalRepository cache → updates expenses$
  → Offline: LocalRepository.getEntitiesByType → filter by condoId + type='expense' → updates expenses$

// Private helpers (mirror IncomesService)
#calculateBaseAmount(amount, exchangeRate): number
#getBaseCurrency(condominiumId): string
#currentProfileId(): string
```

## Component Design

### `ExpenseFormComponent`

- **Type**: Standalone, `ControlContainer` for parent binding
- **Inputs**: `condominiumId` (required string), `baseCurrency` (string)
- **Outputs**: `formSubmit: EventEmitter<ExpenseFormValue>`, `cancelled: EventEmitter<void>`
- **State**: `categories$` (loaded via `TransactionCategories.fetchByType(condoId, 'expense')`), `accounts$` (from `CondominiumAccounts`), `currencies$` (from `Currency`)
- **Validation**: account_id (required), category_id (required), amount (required, min 0.01), original_currency (required), exchange_rate (required when currency ≠ base, min 0.0001), transaction_date (required, MUST NOT be future-dated), description (optional), reference_number (optional)
- **Conditional field**: exchange rate hidden when `original_currency === baseCurrency`, defaults to 1.0

### `ExpenseFormModalComponent`

- **Type**: Standalone, wraps `app-expense-form` in `ion-modal`
- **On submit**: calls `ExpensesService.createExpense()`, toasts success (close modal) or error (keep open)
- **Error handling**: Postgres code `23505` → "Duplicate reference number" toast; generic errors → "Failed to create expense"

### `ExpenseListComponent`

- **Type**: Standalone
- **State**: subscribes to `ExpensesService.expenses$` and `loading$`
- **Per item**: account name, category name, amount (2 decimals + symbol), date (locale), sync status icon
- **Sync indicator**: `_local_status === 'pending'` → pending icon; else completed icon

## i18n Keys

Add to existing namespaces — reuse `financial.transactions.toast.*` and `financial.transactions.form.*` where possible:

| Key | EN | ES |
|-----|----|----|
| `financial.transactions.toast.expenseCreated` | "Expense created successfully" | "Gasto creado exitosamente" |
| `financial.transactions.toast.expenseCreateError` | "Failed to create expense" | "Error al crear el gasto" |
| `financial.transactions.toast.duplicateReferenceNumber` | "Duplicate reference number" | "Número de referencia duplicado" |
| `validation.futureDate` | "Date cannot be in the future" | "La fecha no puede ser futura" |
| `validation.minAmount` | "Minimum amount is 0.01" | "El monto mínimo es 0.01" |

## Test Strategy

| Layer | What to Test |
|-------|-------------|
| `ExpensesService` (unit) | `createExpense` online path (Supabase insert + wallet refresh + telemetry), offline path (local ID + local_status + sync queue), `fetchExpensesByCondominium` updates expenses$, error propagation to error$, base amount calculation, base currency resolution. Target: 80%+ |
| `ExpenseFormComponent` (unit) | Category filtering (only expense types), exchange rate conditional visibility, future date validation rejection, valid form emits formSubmit, invalid form blocks submission, cancel emits cancelled. Target: 70%+ |
| `ExpenseFormModalComponent` (unit) | Success path: toast + modal dismiss + form reset. Error 23505: duplicate toast + modal stays open. Generic error: error toast + modal stays open. Target: 70%+ |
| `ExpenseListComponent` (unit) | Populated state (N items rendered), empty state (message + create button), loading state (spinner), sync status icon (pending vs completed). Target: 70%+ |

## Integration Plan

Wire into transaction list page by adding "New expense" button alongside existing transaction creation controls. Button opens `ExpenseFormModalComponent`. The expense list component renders within the existing transaction list page's expense tab.

## Open Questions

None — the design mirrors established patterns in `FinancialTransactions`, `TransactionCategories`, and `CondominiumAccounts` services.
