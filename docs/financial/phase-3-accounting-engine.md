# Fase 3: Motor Contable Automático

## Descripción General

La Fase 3 implementa el motor contable que genera automáticamente asientos de partida doble cuando se crea una transacción financiera. Este motor está implementado como **Postgres Trigger** para garantizar consistencia atómica y cumplimiento legal.

**Principio fundamental**: El usuario NO necesita saber contabilidad. El sistema traduce automáticamente:
- "Gasté $300 en Electricidad desde Banco Mercantil" → Asientos contables formales

---

## Arquitectura

### Diagrama de Flujo

```
─────────────────────────────────────────────────────────────┐
│  CLIENTE (Angular)                                          │
│  - Valida datos de entrada                                  │
│  - Envía transacción al servidor                            │
────────────────────┬────────────────────────────────────────
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  POSTGRES TRIGGER (generate_accounting_entries)             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 1. Busca cuenta contable de la billetera (FK directa) │ │
│  │ 2. Busca cuenta contable de la categoría              │ │
│  │ 3. Genera asientos débito/crédito                     │ │
│  │ 4. Valida partida doble (debits = credits)            │ │
│  │ 5. Todo en una transacción atómica                    │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Base de Datos

### Tabla: `chart_of_accounts_system` (Cuentas Globales)

**Propósito**: Catálogo maestro de cuentas contables compartido por todos los condominios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, auto-generado |
| `parent_id` | uuid | FK → self (jerarquía) |
| `code` | varchar(50) | Código contable UNIQUE global (ej. "5.1.01") |
| `name` | varchar(100) | Nombre en español |
| `name_en` | varchar(100) | Nombre en inglés |
| `type` | varchar(20) | asset, liability, equity, income, expense |
| `description` | text | Descripción en español |
| `description_en` | text | Descripción en inglés |
| `is_active` | boolean | TRUE = cuenta activa |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |

**Seed Data**: 30 cuentas (5 nivel 1, 11 nivel 2, 14 nivel 3)

**RLS**: Solo lectura para usuarios (service_role para modificaciones)

---

### Tabla: `chart_of_accounts` (Cuentas por Condominio)

**Propósito**: Cuentas contables específicas de cada condominio.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, auto-generado |
| `condominium_id` | uuid | FK → condominiums (CASCADE) |
| `system_account_id` | uuid | FK → chart_of_accounts_system (referencia a cuenta global) |
| `parent_id` | uuid | FK → self (jerarquía dentro del condominio) |
| `code` | varchar(50) | Código contable (unique por condominio) |
| `name` | varchar(100) | Nombre |
| `name_en` | varchar(100) | Nombre en inglés |
| `type` | varchar(20) | asset, liability, equity, income, expense |
| `is_system_defined` | boolean | Computed: TRUE si system_account_id IS NOT NULL |
| `is_active` | boolean | TRUE = cuenta activa |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |
| `deleted_at` | timestamptz | Soft delete |

**Triggers**:
- `trg_condominiums_auto_populate_chart_of_accounts`: Auto-popula cuentas cuando se crea condominio
- `trg_chart_of_accounts_prevent_system_modification`: Bloquea edición de cuentas del sistema
- `trg_chart_of_accounts_prevent_system_deletion`: Bloquea eliminación de cuentas del sistema

**RLS**:
- SELECT: Miembros del condominio
- INSERT/UPDATE/DELETE: Admin/Operator (bloqueado para is_system_defined = true)

---

### Tabla: `financial_transaction_entries` (Asientos Contables)

**Propósito**: Almacenar los asientos de débito/crédito generados automáticamente.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, auto-generado |
| `transaction_id` | uuid | FK → financial_transactions (CASCADE) |
| `account_id` | uuid | FK → chart_of_accounts (RESTRICT) |
| `entry_type` | varchar(6) | debit o credit |
| `amount` | numeric(15,2) | Monto del asiento (≥ 0) |
| `created_at` | timestamptz | Fecha de creación |

**Restricciones**:
- `entry_type` IN ('debit', 'credit')
- `amount` ≥ 0

**Índices**:
- `idx_fte_transaction_id` (transaction_id)
- `idx_fte_account_id` (account_id)

**RLS**: Solo lectura (generados por sistema)

---

### Tabla: `condominium_accounts` (Columna Agregada)

**Columna**: `chart_account_id`

**Propósito**: FK directa desde billetera a cuenta contable.

```sql
chart_account_id uuid references chart_of_accounts(id) on delete set null
```

**Auto-populación**: Se asigna automáticamente basado en `account_type`:
- bank → 1.1.02 (Banco)
- cash/wallet → 1.1.01 (Caja Chica)
- credit → 2.1.01 (Fondo de Reserva)
- investment → 1.1.02 (Banco)

---

## Trigger: `generate_accounting_entries()`

**Archivo**: `supabase/migrations/20260703000004_accounting_engine_trigger.sql`

**Propósito**: Generar asientos contables automáticamente cuando se inserta una transacción.

### Lógica:

```sql
-- Paso 1: Obtener cuenta contable de la billetera (lookup directo)
select chart_account_id into v_wallet_account_id
from condominium_accounts
where id = new.account_id;

-- Paso 2: Generar asientos según tipo de transacción
case new.type
    when 'income' then
        -- Débito: Cuenta de activo (billetera aumenta)
        -- Crédito: Cuenta de ingreso (categoría)
    when 'expense' then
        -- Débito: Cuenta de egreso (categoría)
        -- Crédito: Cuenta de activo (billetera disminuye)
    when 'transfer' then
        -- Débito: Cuenta de activo destino
        -- Crédito: Cuenta de activo origen
end case;

-- Paso 3: Validar partida doble
if abs(total_debits - total_credits) > 0.01 then
    raise exception 'Double-entry validation failed';
end if;
```

### Reglas de Partida Doble:

| Tipo Transacción | Débito | Crédito |
|-----------------|--------|---------|
| **Income** | Cuenta de Activo (billetera) | Cuenta de Ingreso (categoría) |
| **Expense** | Cuenta de Egreso (categoría) | Cuenta de Activo (billetera) |
| **Transfer** | Cuenta de Activo destino | Cuenta de Activo origen |

### Ejemplos:

**Ingreso**: Propietario paga $100 de alícuota
```
DÉBITO  $100 → 1.1.02 Banco (activo aumenta)
CRÉDITO $100 → 4.1.01 Alícuotas de Condominio (ingreso)
```

**Egreso**: Pago de electricidad $300
```
DÉBITO  $300 → 5.1.01 Electricidad (gasto)
CRÉDITO $300 → 1.1.02 Banco (activo disminuye)
```

**Transferencia**: $500 de Banco a Caja Chica
```
DÉBITO  $500 → 1.1.01 Caja Chica (activo aumenta)
CRÉDITO $500 → 1.1.02 Banco (activo disminuye)
```

---

## Servicios Angular

### `ChartOfAccountsSystemService`

**Archivo**: `src/app/core/services/chart-of-accounts-system/chart-of-accounts-system.service.ts`

**Propósito**: Servicio read-only para consultar cuentas contables globales del sistema.

#### Métodos:

```typescript
/**
 * Fetch all active system accounts.
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * @returns Array of ChartOfAccountsSystem sorted by code
 */
async fetchAll(): Promise<ChartOfAccountsSystem[]>

/**
 * Fetch system accounts as a hierarchical tree.
 * Returns root accounts with children array populated.
 * @returns Array of ChartOfAccountsSystemTreeNode
 */
async fetchTree(): Promise<ChartOfAccountsSystemTreeNode[]>
```

**Estado**:
- `accounts$: BehaviorSubject<ChartOfAccountsSystem[]>`
- `loading$: BehaviorSubject<boolean>`
- `error$: BehaviorSubject<unknown>`

---

### `ChartOfAccountsService`

**Archivo**: `src/app/core/services/chart-of-accounts/chart-of-accounts.service.ts`

**Propósito**: Gestionar cuentas contables por condominio con protección de cuentas del sistema.

#### Métodos:

```typescript
/**
 * Fetch all chart of accounts for a condominium.
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * @param condominiumId - The condominium ID
 * @returns Array of ChartOfAccounts sorted by code
 */
async fetchByCondominium(condominiumId: string): Promise<ChartOfAccounts[]>

/**
 * Fetch chart of accounts as a hierarchical tree.
 * Returns root accounts with children array populated.
 * @param condominiumId - The condominium ID
 * @returns Array of ChartOfAccountsTreeNode
 */
async fetchTree(condominiumId: string): Promise<ChartOfAccountsTreeNode[]>

/**
 * Create a new user-defined chart of account.
 * Cannot create system-defined accounts (auto-populated by trigger).
 * Online: inserts into Supabase.
 * Offline: creates local record and queues mutation.
 * @param data - Account creation data
 * @returns Created ChartOfAccounts
 */
async create(data: CreateChartOfAccountsData): Promise<ChartOfAccounts>

/**
 * Update an existing chart of account.
 * Rejects if account is system-defined (is_system_defined = true).
 * @param id - The account ID
 * @param data - Partial account data
 */
async update(id: string, data: Partial<CreateChartOfAccountsData>): Promise<void>

/**
 * Soft-delete a chart of account.
 * Rejects if account is system-defined.
 * @param id - The account ID
 */
async delete(id: string): Promise<void>
```

**Validaciones**:
- Cuentas del sistema no se pueden modificar ni eliminar
- Código único por condominio

---

### `AccountingEngineService`

**Archivo**: `src/app/core/services/accounting-engine/accounting-engine.service.ts`

**Propósito**: Motor de partida doble (actualmente no se usa directamente, la lógica está en el trigger de Postgres).

**Nota**: Este servicio existe como referencia para tests y posible uso futuro, pero la generación real de asientos ocurre en el servidor vía trigger.

#### Métodos:

```typescript
/**
 * Generate double-entry accounting entries for a transaction.
 * NOTE: This is now handled by Postgres trigger.
 * This method exists for testing and potential client-side preview.
 * @param transaction - The financial transaction
 * @param walletAccount - The wallet's chart_of_accounts entry
 * @param categoryAccount - The category's chart_of_accounts entry (null for transfers)
 * @param destinationAccount - Optional destination wallet account (for transfers)
 */
async generateEntries(
  transaction: FinancialTransaction,
  walletAccount: ChartOfAccounts,
  categoryAccount: ChartOfAccounts | null,
  destinationAccount?: ChartOfAccounts,
): Promise<void>
```

---

## Tipos TypeScript

### `ChartOfAccountsSystem`

```typescript
interface ChartOfAccountsSystem {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  name_en: string | null;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  description: string | null;
  description_en: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### `ChartOfAccounts`

```typescript
interface ChartOfAccounts {
  id: string;
  condominium_id: string;
  system_account_id: string | null;
  parent_id: string | null;
  code: string;
  name: string;
  name_en: string | null;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  is_system_defined: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

### `FinancialTransactionEntry`

```typescript
interface FinancialTransactionEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  entry_type: 'debit' | 'credit';
  amount: number;
  created_at: string;
}
```

---

## Migraciones

| Archivo | Descripción |
|---------|-------------|
| `20260703000001_chart_of_accounts_system.sql` | Tabla global + 30 cuentas seed |
| `20260703000002_chart_of_accounts.sql` | Tabla por condominio + triggers |
| `20260703000003_financial_transaction_entries.sql` | Tabla de asientos contables |
| `20260703000004_accounting_engine_trigger.sql` | Trigger generate_accounting_entries |
| `20260706000000_add_chart_account_id_to_condominium_accounts.sql` | FK directa billetera → cuenta contable |

---

## Telemetría

**Eventos**:
- `ACCOUNTING_ENTRY_CREATED`: Cuando se generan asientos contables
  - Propiedades: transaction_type, entry_count, amount
- `DOUBLE_ENTRY_VALIDATED`: Cuando se valida partida doble
  - Propiedades: transaction_type, is_balanced

---

## Ventajas del Enfoque Server-Side

| Aspecto | Client-Side | Server-Side (Trigger) |
|---------|-------------|----------------------|
| **Atomicidad** | ❌ Puede fallar | ✅ Garantizada |
| **Offline** | ❌ No genera asientos | ✅ Se ejecuta en sync |
| **Seguridad** | ⚠️ Puede ser bypassed | ✅ Siempre se ejecuta |
| **Performance** |  Múltiples requests | ✅ Un solo request |
| **Consistencia** | ⚠️ Eventual | ✅ Inmediata |

---

## Tests

- **ChartOfAccountsSystemService**: Tests para fetchAll y fetchTree
- **ChartOfAccountsService**: Tests para CRUD, protección de sistema, offline
- **Cobertura**: 80%+

---

## Dependencias

- **Requiere**: Fase 1 (Billeteras y Categorías), Fase 2 (Transacciones Básicas)
- **No bloquea**: Fase 4 (Ciclo de Vida y Conciliación)
