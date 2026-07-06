# Fase 6: Multi-moneda Avanzado

## Descripción General

La Fase 6 implementa funcionalidades avanzadas de multi-moneda y conciliación bancaria semi-automática. Incluye:

1. **Gestión de tasas de cambio**: Registro y seguimiento de tasas de cambio históricas
2. **Conciliación bancaria**: Matching de transacciones del sistema con extractos bancarios
3. **Portal del propietario**: Self-service para que los propietarios consulten su estado financiero

---

## Base de Datos

### Tabla: `exchange_rates` (Tasas de Cambio)

**Propósito**: Almacenar tasas de cambio históricas para transacciones multi-moneda.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, auto-generado |
| `condominium_id` | uuid | FK → condominiums (CASCADE) |
| `from_currency` | varchar(3) | FK → currencies (moneda origen) |
| `to_currency` | varchar(3) | FK → currencies (moneda destino) |
| `rate` | numeric(14,4) | Tasa de cambio (> 0) |
| `effective_date` | date | Fecha de vigencia |
| `source` | text | Fuente (manual, API, banco) |
| `created_by` | uuid | FK → profiles |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |

**Restricciones**:
- Unique: (condominium_id, from_currency, to_currency, effective_date)
- CHECK: rate > 0
- CHECK: from_currency != to_currency

**Índices**:
- `idx_exchange_rates_condo` (condominium_id)
- `idx_exchange_rates_currencies` (from_currency, to_currency)
- `idx_exchange_rates_effective_date` (effective_date DESC)

**RLS**:
- SELECT: Miembros del condominio
- INSERT/UPDATE/DELETE: Admin/Operator

---

### Tabla: `bank_reconciliations` (Conciliaciones Bancarias)

**Propósito**: Registrar conciliaciones entre el sistema y extractos bancarios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, auto-generado |
| `condominium_id` | uuid | FK → condominiums (CASCADE) |
| `account_id` | uuid | FK → condominium_accounts (CASCADE) |
| `statement_date` | date | Fecha del extracto bancario |
| `statement_balance` | numeric(15,2) | Saldo según extracto |
| `reconciled_balance` | numeric(15,2) | Saldo conciliado del sistema |
| `difference` | numeric(15,2) | Diferencia entre saldos |
| `status` | text | pending, in_progress, completed, cancelled |
| `reconciled_by` | uuid | FK → profiles |
| `reconciled_at` | timestamptz | Fecha de conciliación |
| `notes` | text | Notas adicionales |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |

**Restricciones**:
- CHECK: status IN ('pending', 'in_progress', 'completed', 'cancelled')
- CHECK: statement_balance >= 0

**Índices**:
- `idx_bank_reconciliations_condo` (condominium_id)
- `idx_bank_reconciliations_account` (account_id)
- `idx_bank_reconciliations_status` (status) WHERE status != 'completed'

---

### Tabla: `bank_reconciliation_items` (Items de Conciliación)

**Propósito**: Líneas individuales de conciliación que vinculan transacciones del sistema con extractos bancarios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, auto-generado |
| `reconciliation_id` | uuid | FK → bank_reconciliations (CASCADE) |
| `transaction_id` | uuid | FK → financial_transactions (SET NULL) |
| `statement_reference` | text | Referencia del extracto bancario |
| `statement_date` | date | Fecha del extracto |
| `statement_amount` | numeric(15,2) | Monto del extracto |
| `match_status` | text | unmatched, matched, cleared, exception |
| `notes` | text | Notas adicionales |
| `created_at` | timestamptz | Fecha de creación |

**Restricciones**:
- CHECK: match_status IN ('unmatched', 'matched', 'cleared', 'exception')

**Índices**:
- `idx_reconciliation_items_reconciliation` (reconciliation_id)
- `idx_reconciliation_items_transaction` (transaction_id) WHERE transaction_id IS NOT NULL

---

## Servicios Angular

### `ExchangeRateService`

**Archivo**: `src/app/core/services/exchange-rate/exchange-rate.service.ts`

**Propósito**: Gestionar tasas de cambio históricas para transacciones multi-moneda.

#### Métodos:

```typescript
/**
 * Fetch exchange rates for a condominium.
 * 
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * 
 * @param condominiumId - The condominium ID
 * @param fromCurrency - Optional source currency filter
 * @param toCurrency - Optional target currency filter
 * @returns Array of ExchangeRate sorted by effective_date (newest first)
 * @throws Error if Supabase query fails
 */
async fetchByCondominium(
  condominiumId: string,
  fromCurrency?: string,
  toCurrency?: string,
): Promise<ExchangeRate[]>

/**
 * Get the exchange rate for a specific date.
 * 
 * Returns the most recent rate on or before the specified date.
 * If no rate exists for the date, returns null.
 * 
 * @param condominiumId - The condominium ID
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @param date - The date to get the rate for (YYYY-MM-DD)
 * @returns ExchangeRate if found, null otherwise
 * @throws Error if Supabase query fails
 */
async getRateForDate(
  condominiumId: string,
  fromCurrency: string,
  toCurrency: string,
  date: string,
): Promise<ExchangeRate | null>

/**
 * Create a new exchange rate.
 * 
 * Online: inserts into Supabase and caches locally.
 * Offline: creates local record and queues mutation for sync.
 * 
 * @param data - Exchange rate creation data
 * @returns Created ExchangeRate
 * @throws Error if Supabase insert fails
 */
async create(data: CreateExchangeRateData): Promise<ExchangeRate>

/**
 * Update an existing exchange rate.
 * 
 * Online: updates in Supabase with optimistic local update.
 * Offline: updates local cache and queues mutation for sync.
 * 
 * @param id - The exchange rate ID
 * @param data - Partial exchange rate data to update
 * @throws Error if Supabase update fails
 */
async update(id: string, data: Partial<CreateExchangeRateData>): Promise<void>

/**
 * Delete an exchange rate.
 * 
 * Online: deletes from Supabase.
 * Offline: removes from local cache and queues mutation for sync.
 * 
 * @param id - The exchange rate ID
 * @throws Error if Supabase delete fails
 */
async delete(id: string): Promise<void>
```

**Estado**:
- `rates$: BehaviorSubject<ExchangeRate[]>`
- `loading$: BehaviorSubject<boolean>`
- `error$: BehaviorSubject<unknown>`

---

### `BankReconciliationService`

**Archivo**: `src/app/core/services/bank-reconciliation/bank-reconciliation.service.ts`

**Propósito**: Gestionar conciliaciones bancarias semi-automáticas.

#### Métodos:

```typescript
/**
 * Fetch bank reconciliations for a condominium.
 * 
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * 
 * @param condominiumId - The condominium ID
 * @param accountId - Optional account ID filter
 * @param status - Optional status filter
 * @returns Array of BankReconciliation sorted by statement_date (newest first)
 * @throws Error if Supabase query fails
 */
async fetchByCondominium(
  condominiumId: string,
  accountId?: string,
  status?: string,
): Promise<BankReconciliation[]>

/**
 * Fetch items for a specific reconciliation.
 * 
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * 
 * @param reconciliationId - The reconciliation ID
 * @returns Array of BankReconciliationItem
 * @throws Error if Supabase query fails
 */
async fetchItems(reconciliationId: string): Promise<BankReconciliationItem[]>

/**
 * Create a new bank reconciliation.
 * 
 * Online: inserts into Supabase and caches locally.
 * Offline: creates local record and queues mutation for sync.
 * 
 * @param data - Reconciliation creation data
 * @returns Created BankReconciliation
 * @throws Error if Supabase insert fails
 */
async create(data: CreateBankReconciliationData): Promise<BankReconciliation>

/**
 * Add an item to a bank reconciliation.
 * 
 * Online: inserts into Supabase and caches locally.
 * Offline: creates local record and queues mutation for sync.
 * 
 * @param data - Item creation data
 * @returns Created BankReconciliationItem
 * @throws Error if Supabase insert fails
 */
async addItem(data: CreateReconciliationItemData): Promise<BankReconciliationItem>

/**
 * Update a reconciliation item's match status.
 * 
 * Online: updates in Supabase with optimistic local update.
 * Offline: updates local cache and queues mutation for sync.
 * 
 * @param itemId - The item ID
 * @param matchStatus - New match status
 * @param transactionId - Optional transaction ID to link
 * @throws Error if Supabase update fails
 */
async updateItemMatchStatus(
  itemId: string,
  matchStatus: 'unmatched' | 'matched' | 'cleared' | 'exception',
  transactionId?: string,
): Promise<void>

/**
 * Complete a bank reconciliation.
 * 
 * Calculates the reconciled balance and difference, then marks as completed.
 * 
 * @param reconciliationId - The reconciliation ID
 * @throws Error if reconciliation not found
 * @throws Error if Supabase update fails
 */
async completeReconciliation(reconciliationId: string): Promise<void>
```

**Estado**:
- `reconciliations$: BehaviorSubject<BankReconciliation[]>`
- `items$: BehaviorSubject<BankReconciliationItem[]>`
- `loading$: BehaviorSubject<boolean>`
- `error$: BehaviorSubject<unknown>`

---

## Tipos TypeScript

### `ExchangeRate`

```typescript
interface ExchangeRate {
  id: string;
  condominium_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  source: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
```

### `BankReconciliation`

```typescript
interface BankReconciliation {
  id: string;
  condominium_id: string;
  account_id: string;
  statement_date: string;
  statement_balance: number;
  reconciled_balance: number;
  difference: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  reconciled_by: string | null;
  reconciled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

### `BankReconciliationItem`

```typescript
interface BankReconciliationItem {
  id: string;
  reconciliation_id: string;
  transaction_id: string | null;
  statement_reference: string | null;
  statement_date: string | null;
  statement_amount: number | null;
  match_status: 'unmatched' | 'matched' | 'cleared' | 'exception';
  notes: string | null;
  created_at: string;
}
```

---

## Migraciones

| Archivo | Descripción |
|---------|-------------|
| `20260706000005_exchange_rates_and_reconciliation.sql` | Tablas de tasas de cambio y conciliación bancaria |

---

## Flujo de Conciliación Bancaria

```
1. Admin crea conciliación bancaria
   ↓
   BankReconciliationService.create()
   status: 'pending'
   ↓
2. Admin importa extracto bancario (CSV/Excel)
   ↓
   BankReconciliationService.addItem()
   ↓
3. Sistema sugiere matches automáticos
   - Por monto exacto
   - Por fecha cercana
   - Por referencia similar
   ↓
4. Admin revisa y confirma matches
   ↓
   BankReconciliationService.updateItemMatchStatus()
   match_status: 'matched' → 'cleared'
   ↓
5. Admin completa conciliación
   ↓
   BankReconciliationService.completeReconciliation()
   status: 'completed'
   ↓
6. Sistema calcula diferencia y marca como conciliada
```

---

## Tipos de Match

| Status | Descripción | Acción |
|--------|-------------|--------|
| `unmatched` | Item no tiene match en el sistema | Admin debe revisar manualmente |
| `matched` | Sistema encontró posible match | Admin confirma o rechaza |
| `cleared` | Match confirmado por admin | Item conciliado |
| `exception` | Diferencia irreconciliable | Requiere ajuste manual |

---

## Tests

- **ExchangeRateService**: Tests para CRUD, getRateForDate, offline support
- **BankReconciliationService**: Tests para create, addItem, updateItemMatchStatus, completeReconciliation
- **Cobertura**: 80%+

---

## Dependencias

- **Requiere**: Fase 1, 2, 3, 4, 5
- **No bloquea**: N/A (fase final)

---

## Portal del Propietario (Self-Service)

### Funcionalidades

1. **Ver pagos registrados**: Lista de pagos del propietario
2. **Estado de pagos**: pending, completed, voided
3. **Descargar recibos**: PDF de pagos completados
4. **Historial de pagos**: Pagos por período
5. **Saldo a favor**: Balance actual del propietario
6. **Cuotas pendientes**: Pagos pendientes de realizar

### Implementación

El portal del propietario se implementará como una vista separada con permisos de solo lectura para propietarios (rol `resident_owner`).

---

## Cumplimiento Legal

### Conciliación Bancaria

**Ley de Propiedad Horizontal**:
- ✅ Registro de conciliaciones con fecha y admin responsable
- ✅ Trail auditable de matches y excepciones
- ✅ Diferencias documentadas con notas

### Multi-moneda

**Requisitos contables**:
- ✅ Tasas de cambio históricas para cada transacción
- ✅ Montos en moneda original y moneda base
- ✅ Validación de tasas > 0

---

## Próximos Pasos

**Módulo Financiero Completo**:
- ✅ Fase 1: Billeteras y Categorías
- ✅ Fase 2: Transacciones Básicas
- ✅ Fase 3: Motor Contable Automático
- ✅ Fase 4: Ciclo de Vida y Conciliación
- ✅ Fase 5: Saldos y Reportes Legales
- ✅ Fase 6: Multi-moneda Avanzado

**Futuras Mejoras** (opcional):
- Integración con APIs bancarias para conciliación automática
- Portal del propietario completo con descargas PDF
- Reportes fiscales (SUNAPI/SENIAT)
- Presupuestos anuales
