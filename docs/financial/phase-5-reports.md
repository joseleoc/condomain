# Fase 5: Saldos y Reportes Legales

## Descripción General

La Fase 5 implementa el sistema de reportes financieros y contables requeridos por la Ley de Propiedad Horizontal. Incluye:

1. **Saldos mensuales y anuales**: Snapshots automáticos de balances por cuenta
2. **Reportes legales**: Libro Diario, Libro Mayor, Balance de Comprobación
3. **Estados financieros**: Balance General, Estado de Resultados

Todos los reportes se generan automáticamente desde los asientos contables creados en fases anteriores.

---

## Base de Datos

### Tabla: `account_monthly_balances` (Saldos Mensuales)

**Propósito**: Almacenar snapshots mensuales de balances para cada cuenta contable.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, auto-generado |
| `account_id` | uuid | FK → chart_of_accounts (CASCADE) |
| `year` | int | Año fiscal |
| `month` | int | Mes (1-12) |
| `opening_balance` | numeric(15,2) | Saldo al inicio del mes |
| `total_debits` | numeric(15,2) | Total débitos del mes |
| `total_credits` | numeric(15,2) | Total créditos del mes |
| `closing_balance` | numeric(15,2) | Saldo al final del mes |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |

**Restricciones**:
- Unique: (account_id, year, month)
- CHECK: month BETWEEN 1 AND 12
- CHECK: year >= 2020

**Índices**:
- `idx_monthly_balances_account` (account_id)
- `idx_monthly_balances_period` (year, month)

**Trigger**: `trg_update_monthly_balance`
- Se ejecuta AFTER INSERT en `financial_transaction_entries`
- Actualiza automáticamente los totales mensuales

---

### Tabla: `account_annual_balances` (Saldos Anuales)

**Propósito**: Almacenar snapshots anuales de balances para reportes de fin de año.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, auto-generado |
| `account_id` | uuid | FK → chart_of_accounts (CASCADE) |
| `year` | int | Año fiscal |
| `opening_balance` | numeric(15,2) | Saldo al inicio del año |
| `total_debits` | numeric(15,2) | Total débitos del año |
| `total_credits` | numeric(15,2) | Total créditos del año |
| `closing_balance` | numeric(15,2) | Saldo al final del año |
| `is_closed` | boolean | TRUE si el año fiscal está cerrado |
| `closed_at` | timestamptz | Fecha de cierre del año |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |

**Restricciones**:
- Unique: (account_id, year)
- CHECK: year >= 2020

**Índices**:
- `idx_annual_balances_account` (account_id)
- `idx_annual_balances_year` (year)

**Trigger**: `trg_update_annual_balance`
- Se ejecuta AFTER INSERT OR UPDATE en `account_monthly_balances`
- Agrega automáticamente los saldos mensuales al anual

---

## Servicios Angular

### `AccountBalanceService`

**Archivo**: `src/app/core/services/account-balance/account-balance.service.ts`

**Propósito**: Gestionar saldos mensuales y anuales de cuentas contables.

#### Métodos:

```typescript
/**
 * Fetch monthly balances for a specific account.
 * 
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * 
 * @param accountId - The chart of accounts ID
 * @param year - Optional year filter
 * @returns Array of AccountMonthlyBalance sorted by year/month
 * @throws Error if Supabase query fails
 */
async fetchMonthlyByAccount(
  accountId: string,
  year?: number,
): Promise<AccountMonthlyBalance[]>

/**
 * Fetch annual balances for a specific account.
 * 
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * 
 * @param accountId - The chart of accounts ID
 * @returns Array of AccountAnnualBalance sorted by year
 * @throws Error if Supabase query fails
 */
async fetchAnnualByAccount(accountId: string): Promise<AccountAnnualBalance[]>

/**
 * Close a fiscal year for an account.
 * 
 * Marks the annual balance as closed (is_closed = true).
 * Once closed, no more modifications are allowed to that year's balances.
 * 
 * @param accountId - The chart of accounts ID
 * @param year - The fiscal year to close
 * @throws Error if Supabase update fails
 * @throws Error if year is already closed
 */
async closeFiscalYear(accountId: string, year: number): Promise<void>
```

**Estado**:
- `monthlyBalances$: BehaviorSubject<AccountMonthlyBalance[]>`
- `annualBalances$: BehaviorSubject<AccountAnnualBalance[]>`
- `loading$: BehaviorSubject<boolean>`
- `error$: BehaviorSubject<unknown>`

---

### `FinancialReportService`

**Archivo**: `src/app/core/services/financial-report/financial-report.service.ts`

**Propósito**: Generar reportes legales requeridos por la Ley de Propiedad Horizontal.

#### Métodos:

```typescript
/**
 * Generate trial balance report (Balance de Comprobación).
 * 
 * Lists all accounts with their debit/credit totals and balances for a period.
 * Validates that total debits equal total credits.
 * 
 * @param condominiumId - The condominium ID
 * @param periodStart - Start date (YYYY-MM-DD)
 * @param periodEnd - End date (YYYY-MM-DD)
 * @returns TrialBalance report
 * @throws Error if Supabase query fails
 */
async generateTrialBalance(
  condominiumId: string,
  periodStart: string,
  periodEnd: string,
): Promise<TrialBalance>

/**
 * Generate general ledger report (Libro Mayor).
 * 
 * Shows all transactions for a specific account in a period.
 * Includes running balance calculation.
 * 
 * @param accountId - The chart of accounts ID
 * @param periodStart - Start date (YYYY-MM-DD)
 * @param periodEnd - End date (YYYY-MM-DD)
 * @returns GeneralLedger report
 * @throws Error if Supabase query fails
 */
async generateGeneralLedger(
  accountId: string,
  periodStart: string,
  periodEnd: string,
): Promise<GeneralLedger>

/**
 * Generate journal report (Libro Diario).
 * 
 * Shows all transactions in chronological order for a period.
 * Each transaction shows its debit and credit entries.
 * 
 * @param condominiumId - The condominium ID
 * @param periodStart - Start date (YYYY-MM-DD)
 * @param periodEnd - End date (YYYY-MM-DD)
 * @returns Journal report
 * @throws Error if Supabase query fails
 */
async generateJournal(
  condominiumId: string,
  periodStart: string,
  periodEnd: string,
): Promise<Journal>
```

---

### `FinancialStatementService`

**Archivo**: `src/app/core/services/financial-statement/financial-statement.service.ts`

**Propósito**: Generar estados financieros para toma de decisiones.

#### Métodos:

```typescript
/**
 * Generate income statement report (Estado de Resultados).
 * 
 * Shows revenues and expenses for a period, calculating net income.
 * Only includes income and expense account types.
 * 
 * @param condominiumId - The condominium ID
 * @param periodStart - Start date (YYYY-MM-DD)
 * @param periodEnd - End date (YYYY-MM-DD)
 * @returns IncomeStatement report
 * @throws Error if Supabase query fails
 */
async generateIncomeStatement(
  condominiumId: string,
  periodStart: string,
  periodEnd: string,
): Promise<IncomeStatement>

/**
 * Generate balance sheet report (Balance General).
 * 
 * Shows assets, liabilities, and equity at a specific date.
 * Validates that assets = liabilities + equity.
 * 
 * @param condominiumId - The condominium ID
 * @param asOfDate - The date for the balance sheet (YYYY-MM-DD)
 * @returns BalanceSheet report
 * @throws Error if Supabase query fails
 */
async generateBalanceSheet(
  condominiumId: string,
  asOfDate: string,
): Promise<BalanceSheet>
```

---

## Tipos TypeScript

### `AccountMonthlyBalance`

```typescript
interface AccountMonthlyBalance {
  id: string;
  account_id: string;
  year: number;
  month: number;
  opening_balance: number;
  total_debits: number;
  total_credits: number;
  closing_balance: number;
  created_at: string;
  updated_at: string;
}
```

### `AccountAnnualBalance`

```typescript
interface AccountAnnualBalance {
  id: string;
  account_id: string;
  year: number;
  opening_balance: number;
  total_debits: number;
  total_credits: number;
  closing_balance: number;
  is_closed: boolean;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}
```

### `TrialBalance` (Balance de Comprobación)

```typescript
interface TrialBalance {
  condominium_id: string;
  period_start: string;
  period_end: string;
  entries: TrialBalanceEntry[];
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
}
```

### `GeneralLedger` (Libro Mayor)

```typescript
interface GeneralLedger {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  period_start: string;
  period_end: string;
  entries: GeneralLedgerEntry[];
  opening_balance: number;
  closing_balance: number;
}
```

### `Journal` (Libro Diario)

```typescript
interface Journal {
  condominium_id: string;
  period_start: string;
  period_end: string;
  entries: JournalEntry[];
}
```

### `IncomeStatement` (Estado de Resultados)

```typescript
interface IncomeStatement {
  condominium_id: string;
  period_start: string;
  period_end: string;
  revenues: IncomeStatementEntry[];
  expenses: IncomeStatementEntry[];
  total_revenues: number;
  total_expenses: number;
  net_income: number;
}
```

### `BalanceSheet` (Balance General)

```typescript
interface BalanceSheet {
  condominium_id: string;
  as_of_date: string;
  assets: BalanceSheetEntry[];
  liabilities: BalanceSheetEntry[];
  equity: BalanceSheetEntry[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  is_balanced: boolean;
}
```

---

## Migraciones

| Archivo | Descripción |
|---------|-------------|
| `20260706000004_account_balances.sql` | Tablas de saldos mensuales/anuales + triggers |

---

## Flujo de Datos

```
1. Transacción se aprueba (pending → completed)
   ↓
2. Trigger generate_accounting_entries crea asientos
   ↓
3. Trigger update_monthly_balance_on_entry actualiza saldos mensuales
   ↓
4. Trigger update_annual_balance_from_monthly agrega saldos al anual
   ↓
5. Servicios generan reportes desde los saldos acumulados
```

---

## Reportes Legales

### 1. Libro Diario (Journal)

**Propósito**: Registro cronológico de todas las transacciones.

**Contenido**:
- Fecha de transacción
- Descripción
- Número de referencia
- Cuentas afectadas (débito/crédito)
- Montos

**Uso**: Auditoría externa, revisión de transacciones.

---

### 2. Libro Mayor (General Ledger)

**Propósito**: Registro del movimiento de cada cuenta individual.

**Contenido**:
- Código y nombre de cuenta
- Tipo de cuenta
- Entradas individuales con fecha y descripción
- Saldo corrido

**Uso**: Análisis detallado por cuenta, conciliación.

---

### 3. Balance de Comprobación (Trial Balance)

**Propósito**: Verificar que débitos = créditos en un período.

**Contenido**:
- Lista de todas las cuentas
- Total débitos por cuenta
- Total créditos por cuenta
- Saldo final por cuenta
- Validación: total_debits = total_credits

**Uso**: Control interno, preparación de estados financieros.

---

## Estados Financieros

### 1. Balance General (Balance Sheet)

**Propósito**: Mostrar la posición financiera en una fecha específica.

**Ecuación**: Activos = Pasivos + Patrimonio

**Contenido**:
- **Activos**: Cuentas de activo con saldos
- **Pasivos**: Cuentas de pasivo con saldos
- **Patrimonio**: Cuentas de patrimonio con saldos
- Validación: total_assets = total_liabilities + total_equity

**Uso**: Análisis de solvencia, toma de decisiones.

---

### 2. Estado de Resultados (Income Statement)

**Propósito**: Mostrar ingresos y gastos en un período.

**Ecuación**: Utilidad Neta = Ingresos - Gastos

**Contenido**:
- **Ingresos**: Cuentas de ingreso con montos
- **Gastos**: Cuentas de gasto con montos
- **Utilidad Neta**: Ingresos totales - Gastos totales

**Uso**: Análisis de rentabilidad, presupuestos.

---

## Tests

- **AccountBalanceService**: Tests para fetch monthly/annual, close fiscal year
- **FinancialReportService**: Tests para trial balance, general ledger, journal
- **FinancialStatementService**: Tests para income statement, balance sheet
- **Cobertura**: 80%+

---

## Dependencias

- **Requiere**: Fase 1, 2, 3, 4
- **No bloquea**: Fase 6 (Multi-moneda Avanzado)

---

## Cumplimiento Legal

### Ley de Propiedad Horizontal

**Libros Obligatorios**:
- ✅ Libro Diario → `FinancialReportService.generateJournal()`
- ✅ Libro Mayor → `FinancialReportService.generateGeneralLedger()`
- ✅ Balance de Comprobación → `FinancialReportService.generateTrialBalance()`

**Estados Financieros**:
- ✅ Balance General → `FinancialStatementService.generateBalanceSheet()`
- ✅ Estado de Resultados → `FinancialStatementService.generateIncomeStatement()`

**Inmutabilidad**:
- ✅ Transacciones completed/voided son inmutables
- ✅ Años fiscales cerrados (is_closed = true) no se pueden modificar
- ✅ Trail auditable completo

---

## Próximos Pasos

**Fase 6: Multi-moneda Avanzado** (opcional)
- Captura de tasas de cambio en tiempo real
- Doble almacenamiento de montos (original + base)
- Conciliación bancaria semi-automática
- Portal del propietario (self-service)
