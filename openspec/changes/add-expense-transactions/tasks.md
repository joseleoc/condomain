# Tasks: Add Expense Transactions

## Task 1: Create ExpensesService

**Description**: Create the ExpensesService following the exact pattern of IncomesService. Uses Supabase client directly, supports online/offline modes, handles wallet cache refresh.

**Files**:
- Create: `src/app/core/services/expenses/expenses.service.ts`
- Create: `src/app/core/services/expenses/expenses.service.spec.ts`

**Dependencies**: None (first task)

**Acceptance Criteria**:
- [ ] Service injects: Supabase, NetworkStatusService, LocalRepository, SyncService, TelemetryService, Profile, ContextService, CondominiumAccounts
- [ ] State: `expenses$`, `loading$`, `error$` BehaviorSubjects
- [ ] `createExpense(data)` online: Supabase INSERT with status='completed', cache locally, refresh wallet, track telemetry
- [ ] `createExpense(data)` offline: local UUID, status='pending', _local_status='pending', enqueue mutation
- [ ] `fetchExpensesByCondominium(condoId)` filters by type='expense'
- [ ] Private helpers: #calculateBaseAmount, #getBaseCurrency, #currentProfileId
- [ ] Unit tests cover online/offline paths, error handling, wallet refresh (80%+ coverage)

**Estimated Complexity**: Medium

---

## Task 2: Create ExpenseFormComponent

**Description**: Create the expense form component with reactive form, category filtering by type='expense', exchange rate conditional visibility, and future date validation.

**Files**:
- Create: `src/app/shared/components/forms/expense-form/expense-form.component.ts`
- Create: `src/app/shared/components/forms/expense-form/expense-form.component.html`
- Create: `src/app/shared/components/forms/expense-form/expense-form.component.scss`
- Create: `src/app/shared/components/forms/expense-form/expense-form.component.spec.ts`

**Dependencies**: Task 1 (ExpensesService must exist for type references)

**Acceptance Criteria**:
- [ ] Standalone component with inject() DI
- [ ] Inputs: condominiumId (required), baseCurrency (required)
- [ ] Outputs: formSubmit (ExpenseFormValue), cancelled (void)
- [ ] Form fields: account_id, category_id, amount, original_currency, exchange_rate, description, reference_number, transaction_date
- [ ] Categories filtered by category_type='expense' (computed signal)
- [ ] Exchange rate field visible only when currency ≠ baseCurrency
- [ ] Validation: required fields, min amount 0.01, future date rejection
- [ ] Form reset functionality
- [ ] HTML template with IonInput, IonSelect, IonDatetime, IonButton
- [ ] SCSS styles (mirror income-form styles)
- [ ] Unit tests cover category filtering, exchange rate visibility, validation, form submission (70%+ coverage)

**Estimated Complexity**: Medium

---

## Task 3: Create ExpenseFormModalComponent

**Description**: Create the modal wrapper that contains the expense form, calls ExpensesService.createExpense(), and handles success/error toasts.

**Files**:
- Create: `src/app/shared/components/modals/expense-form-modal/expense-form-modal.component.ts`
- Create: `src/app/shared/components/modals/expense-form-modal/expense-form-modal.component.html`
- Create: `src/app/shared/components/modals/expense-form-modal/expense-form-modal.component.spec.ts`

**Dependencies**: Task 1 (ExpensesService), Task 2 (ExpenseFormComponent)

**Acceptance Criteria**:
- [ ] Standalone component wrapping app-expense-form in ion-modal
- [ ] Inputs: isOpen, condominiumId, baseCurrency
- [ ] Outputs: isOpenChange, formSubmit
- [ ] ViewChild: expenseForm (ExpenseFormComponent)
- [ ] On submit: calls ExpensesService.createExpense()
- [ ] Success: toast "Expense created successfully", close modal, reset form
- [ ] Error 23505: toast "Duplicate reference number", keep modal open
- [ ] Generic error: toast "Failed to create expense", keep modal open
- [ ] HTML template with IonModal, IonHeader, IonToolbar, IonContent, IonFooter
- [ ] Unit tests cover success path, duplicate error, generic error (70%+ coverage)

**Estimated Complexity**: Low

---

## Task 4: Create ExpenseListComponent

**Description**: Create the list component that displays expenses with account names, sync status indicators, and handles loading/empty/populated states.

**Files**:
- Create: `src/app/shared/components/expense-list/expense-list.component.ts`
- Create: `src/app/shared/components/expense-list/expense-list.component.html`
- Create: `src/app/shared/components/expense-list/expense-list.component.scss`
- Create: `src/app/shared/components/expense-list/expense-list.component.spec.ts`

**Dependencies**: Task 1 (ExpensesService)

**Acceptance Criteria**:
- [ ] Standalone component with inject() DI
- [ ] Input: condominiumId (required)
- [ ] State: expenses (toSignal from expenses$), loading (toSignal from loading$), accounts (toSignal from accounts$)
- [ ] accountMap computed signal for account name lookup
- [ ] ngOnInit: fetchExpensesByCondominium, fetchByCondominium (accounts)
- [ ] Display per expense: account name, amount (2 decimals + currency), date (locale), sync status icon
- [ ] Sync status: _local_status='pending' → sync-outline (warning); else → checkmark-circle (success)
- [ ] Loading state: IonSpinner
- [ ] Empty state: message + create button
- [ ] HTML template with IonList, IonItem, IonLabel, IonIcon, IonNote
- [ ] SCSS styles (mirror income-list styles)
- [ ] Unit tests cover populated/empty/loading states, sync indicators (70%+ coverage)

**Estimated Complexity**: Low

---

## Task 5: Add i18n Keys

**Description**: Add expense-related translation keys to en.json and es.json.

**Files**:
- Modify: `src/assets/i18n/en.json`
- Modify: `src/assets/i18n/es.json`

**Dependencies**: None (can be done in parallel with other tasks)

**Acceptance Criteria**:
- [ ] Add under `financial.transactions.toast.*`:
  - `expenseCreated`: "Expense created successfully" / "Gasto creado exitosamente"
  - `expenseCreateError`: "Failed to create expense" / "Error al crear el gasto"
  - `duplicateReferenceNumber`: "Duplicate reference number" / "Número de referencia duplicado"
- [ ] Add under `validation.*` (if not present):
  - `futureDate`: "Date cannot be in the future" / "La fecha no puede ser futura"
  - `minAmount`: "Minimum amount is 0.01" / "El monto mínimo es 0.01"
- [ ] All keys resolve correctly in both languages

**Estimated Complexity**: Low

---

## Task 6: Integrate into Transaction List Page

**Description**: Add expense creation button to the transaction list page and wire up the modal.

**Files**:
- Modify: `src/app/features/financial/pages/transaction-list/transaction-list.page.ts`
- Modify: `src/app/features/financial/pages/transaction-list/transaction-list.page.html`

**Dependencies**: Task 2 (ExpenseFormComponent), Task 3 (ExpenseFormModalComponent), Task 4 (ExpenseListComponent), Task 5 (i18n keys)

**Acceptance Criteria**:
- [ ] Import ExpenseFormModalComponent and ExpenseListComponent
- [ ] Add "New expense" button (IonFab or IonButton) alongside existing transaction controls
- [ ] Add signal: isExpenseFormOpen
- [ ] Add method: openExpenseForm(), closeExpenseForm()
- [ ] Wire up modal: [isOpen]="isExpenseFormOpen()" (isOpenChange)="closeExpenseForm()"
- [ ] Add expense list component in expense tab/section
- [ ] Button opens modal, modal creates expense, list updates

**Estimated Complexity**: Low

---

## Execution Order

```
Task 1 (Service) ──┐
                    ├──→ Task 3 (Modal) ──┐
Task 2 (Form) ─────┘                      ├──→ Task 6 (Integration)
                                           │
Task 4 (List) ─────────────────────────────┘
                                           
Task 5 (i18n) ────────────────────────────→ Task 6 (Integration)
```

**Parallel opportunities**:
- Tasks 1, 2, 4, 5 can start in parallel
- Task 3 waits for Tasks 1 and 2
- Task 6 waits for all others

**Total estimated files**: 14 new files, 4 modified files
**Total estimated complexity**: Medium (service is most complex)
