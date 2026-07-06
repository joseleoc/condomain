# Fase 2: Transacciones Básicas

## Descripción General

La Fase 2 implementa el registro de transacciones financieras (ingresos, egresos y transferencias) con una interfaz simplificada. El usuario solo necesita especificar:

- **Monto**: Cuánto dinero
- **Billetera**: De dónde sale o a dónde entra
- **Categoría**: Para qué es (solo ingresos/egresos)
- **Fecha y descripción**: Cuándo y por qué

El sistema automáticamente genera los asientos contables de partida doble (Fase 3).

---

## Base de Datos

### Tabla: `financial_transactions`

**Propósito**: Registrar movimientos financieros del condominio.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, auto-generado |
| `condominium_id` | uuid | FK → condominiums (CASCADE) |
| `account_id` | uuid | FK → condominium_accounts (RESTRICT) |
| `category_id` | uuid | FK → transaction_categories (RESTRICT, nullable para transferencias) |
| `transfer_group_id` | uuid | Agrupa las dos piernas de una transferencia |
| `type` | text | income, expense, o transfer |
| `status` | text | pending, completed, voided |
| `amount` | numeric(15,2) | Monto en moneda original (> 0) |
| `original_currency` | varchar(3) | FK → currencies |
| `exchange_rate` | numeric(14,4) | Tasa de cambio (> 0, default 1.0000) |
| `base_amount` | numeric(15,2) | Monto en moneda base (amount * exchange_rate) |
| `base_currency` | varchar(3) | FK → currencies (moneda base del condominio) |
| `description` | text | Descripción de la transacción |
| `reference_number` | text | Número de referencia (transferencia, cheque, factura) |
| `transaction_date` | date | Fecha del hecho económico |
| `created_by` | uuid | FK → profiles (quién creó la transacción) |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |
| `deleted_at` | timestamptz | Soft delete |

**Restricciones**:
- `type` IN ('income', 'expense', 'transfer')
- `status` IN ('pending', 'completed', 'voided')
- `amount` > 0
- `exchange_rate` > 0
- Unique: (condominium_id, reference_number) WHERE deleted_at IS NULL AND reference_number IS NOT NULL

**Índices**:
- `idx_ft_condo_date_active` (condominium_id, transaction_date DESC)
- `idx_ft_account_date_active` (account_id, transaction_date DESC)
- `idx_ft_category_date_active` (category_id, transaction_date DESC)
- `idx_ft_status_pending_active` (status) WHERE status = 'pending'

**Triggers**:
- `trg_check_status_transition`: Valida transiciones de estado (pending→completed, pending→voided, completed→voided)
- `trg_prevent_terminal_edit`: Bloquea edición de transacciones completed/voided

**RLS**:
- SELECT: Miembros del condominio
- INSERT/UPDATE/DELETE: Admin/Operator

---

## Servicios Angular

### `FinancialTransactionsService`

**Archivo**: `src/app/core/services/financial-transactions/financial-transactions.ts`

**Propósito**: Gestionar transacciones financieras con soporte offline-first.

#### Métodos:

```typescript
/**
 * Fetch transactions for a condominium with optional filters.
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * @param condominiumId - The condominium ID
 * @param filters - Optional filters (account_id, category_id, type, status, date_from, date_to)
 * @returns Array of FinancialTransaction sorted by date (newest first)
 */
async fetchByCondominium(
  condominiumId: string,
  filters: TransactionFilter = {},
): Promise<FinancialTransaction[]>

/**
 * Fetch transactions for a specific wallet account.
 * @param accountId - The wallet account ID
 * @returns Array of FinancialTransaction
 */
async fetchByAccount(accountId: string): Promise<FinancialTransaction[]>

/**
 * Fetch transactions for a specific category.
 * @param categoryId - The category ID
 * @returns Array of FinancialTransaction
 */
async fetchByCategory(categoryId: string): Promise<FinancialTransaction[]>

/**
 * Fetch a single transaction by ID.
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * @param id - The transaction ID
 * @returns FinancialTransaction or null
 */
async getById(id: string): Promise<FinancialTransaction | null>

/**
 * Create a new income/expense/transfer transaction.
 * Online: inserts into Supabase, caches locally, tracks telemetry.
 * Offline: generates local UUID, queues mutation for sync.
 * Accounting entries are generated automatically by Postgres trigger.
 * @param data - Transaction creation data
 * @returns Created FinancialTransaction
 */
async create(data: CreateFinancialTransactionData): Promise<FinancialTransaction>

/**
 * Create a transfer as two linked transactions (expense leg + income leg).
 * Both legs share the same transfer_group_id.
 * @param data - Transfer creation data (source, destination, amount)
 * @returns Array of two FinancialTransaction (expense leg, income leg)
 */
async createTransfer(data: CreateTransferData): Promise<FinancialTransaction[]>

/**
 * Update an existing transaction.
 * Rejects edits to completed or voided transactions (immutable).
 * Online: updates in Supabase with optimistic local update.
 * Offline: updates local cache and queues mutation for sync.
 * @param id - The transaction ID
 * @param data - Partial transaction data to update
 */
async update(id: string, data: UpdateFinancialTransactionData): Promise<void>

/**
 * Soft-delete a transaction.
 * Online: calls RPC function to set deleted_at.
 * Offline: updates local cache and queues mutation for sync.
 * @param id - The transaction ID
 */
async delete(id: string): Promise<void>
```

**Estado**:
- `transactions$: BehaviorSubject<FinancialTransaction[]>` - Lista reactiva de transacciones
- `loading$: BehaviorSubject<boolean>` - Estado de carga
- `error$: BehaviorSubject<unknown>` - Estado de error

---

## Tipos TypeScript

### `FinancialTransaction`

```typescript
interface FinancialTransaction {
  id: string;
  condominium_id: string;
  account_id: string;
  category_id: string | null;
  transfer_group_id: string | null;
  type: 'income' | 'expense' | 'transfer';
  status: 'pending' | 'completed' | 'voided';
  amount: number;
  original_currency: string;
  exchange_rate: number;
  base_amount: number;
  base_currency: string;
  description: string;
  reference_number: string | null;
  transaction_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Approval fields (Fase 4)
  approved_at: string | null;
  approved_by: string | null;
  // Reconciliation fields (Fase 4)
  reconciled_at: string | null;
  reconciled_by: string | null;
  // Reversal fields (Fase 4)
  reversal_transaction_id: string | null;
  reversed_by_transaction_id: string | null;
  reversal_reason: string | null;
}
```

### `CreateFinancialTransactionData`

```typescript
interface CreateFinancialTransactionData {
  condominium_id: string;
  account_id: string;
  category_id?: string | null;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  original_currency: string;
  exchange_rate?: number;
  base_currency: string;
  description: string;
  reference_number?: string | null;
  transaction_date: string;
  transfer_group_id?: string | null;
}
```

### `CreateTransferData`

```typescript
interface CreateTransferData {
  condominium_id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  original_currency: string;
  exchange_rate?: number;
  base_currency: string;
  description: string;
  transaction_date: string;
}
```

### `TransactionFilter`

```typescript
interface TransactionFilter {
  account_id?: string;
  category_id?: string;
  type?: 'income' | 'expense' | 'transfer';
  status?: 'pending' | 'completed' | 'voided';
  date_from?: string;
  date_to?: string;
}
```

---

## Migraciones

| Archivo | Descripción |
|---------|-------------|
| `20260702000000_financial_transactions.sql` | Tabla, RLS, triggers, RPCs |
| `20260703000000_add_base_currency_to_financial_transactions.sql` | Columna base_currency |

---

## Telemetría

**Eventos**:
- `FINANCIAL_TRANSACTION_CREATED`: Cuando se crea una transacción
  - Propiedades: transaction_type, amount, currency, condominium_id, is_transfer, has_exchange_rate

---

## Tests

- **FinancialTransactionsService**: Tests para online/offline fetch, create, update, delete, transfer creation
- **Cobertura**: 80%+

---

## Dependencias

- **Requiere**: Fase 1 (Billeteras y Categorías)
- **No bloquea**: Fase 3 (Motor Contable Automático)
