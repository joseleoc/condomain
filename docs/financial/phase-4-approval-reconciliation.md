# Fase 4: Ciclo de Vida y Conciliación

## Descripción General

La Fase 4 implementa el flujo completo de aprobación de transacciones y conciliación bancaria, permitiendo al administrador gestionar el ciclo de vida de las transacciones desde `pending` hasta `completed` o `voided`.

**Principio fundamental**: Las transacciones no afectan los saldos hasta ser aprobadas, garantizando control y auditoría.

---

## Máquina de Estados

```
pending → completed → voided
                     
pending → voided
```

### Estados:

| Estado | Descripción | Saldos Actualizados | Inmutable |
|--------|-------------|---------------------|-----------|
| **pending** | Registrada pero no conciliada | ❌ NO | ✅ Editable |
| **completed** | Aprobada y conciliada | ✅ SÍ | ✅ SÍ |
| **voided** | Anulada mediante reversa | ✅ Revertidos | ✅ SÍ |

### Transiciones Válidas:

| De | A | Acción | Descripción |
|----|---|--------|-------------|
| `pending` | `completed` | Aprobar | Actualiza saldo de billetera |
| `pending` | `voided` | Anular | Sin reversa necesaria |
| `completed` | `voided` | Anular | Crea transacción de reversa |

### Transiciones Inválidas:

| De | A | Razón |
|----|---|-------|
| `completed` | `pending` | No se puede "des-aprobar" |
| `voided` | cualquier | Transacción anulada es inmutable |

---

## Base de Datos

### Columnas Agregadas a `financial_transactions`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `approved_at` | timestamptz | Fecha de aprobación (pending → completed) |
| `approved_by` | uuid | FK → profiles (admin que aprobó) |
| `reconciled_at` | timestamptz | Fecha de conciliación con banco |
| `reconciled_by` | uuid | FK → profiles (admin que concilió) |
| `reversal_transaction_id` | uuid | FK → financial_transactions (transacción de reversa) |
| `reversed_by_transaction_id` | uuid | FK → financial_transactions (transacción original revertida) |
| `reversal_reason` | text | Razón de la reversa (audit trail) |

**Índices**:
- `idx_ft_approved_at` (WHERE approved_at IS NOT NULL)
- `idx_ft_reconciled_at` (WHERE reconciled_at IS NULL AND deleted_at IS NULL)
- `idx_ft_reversal_transaction_id` (WHERE reversal_transaction_id IS NOT NULL)
- `idx_ft_reversed_by_transaction_id` (WHERE reversed_by_transaction_id IS NOT NULL)

---

## Triggers

### `update_wallet_balance_on_approval()`

**Archivo**: `supabase/migrations/20260706000002_update_wallet_balance_on_approval.sql`

**Propósito**: Actualizar saldo de billetera automáticamente cuando una transacción se aprueba.

**Se ejecuta**: AFTER UPDATE OF status ON financial_transactions WHEN (new.status = 'completed' AND old.status != 'completed')

**Lógica**:

```sql
case new.type
    when 'income' then
        -- Income aumenta saldo de billetera
        v_balance_change := new.base_amount;
    when 'expense' then
        -- Expense disminuye saldo de billetera
        v_balance_change := -new.base_amount;
    when 'transfer' then
        -- Transfer: destino aumenta, origen disminuye
        -- Ambas piernas se manejan separadamente
end case;

update condominium_accounts
set current_balance = current_balance + v_balance_change
where id = new.account_id;
```

---

### `create_reversal_transaction()`

**Archivo**: `supabase/migrations/20260706000003_create_reversal_transaction.sql`

**Propósito**: Crear transacción de reversa para anular transacciones completadas.

**Parámetros**:
- `p_original_transaction_id`: UUID de la transacción original
- `p_reversal_reason`: Razón de la reversa (texto)
- `p_approved_by`: UUID del admin que solicita la reversa

**Retorna**: UUID de la nueva transacción de reversa

**Lógica**:

```sql
-- 1. Validar que la transacción original existe y está completed
-- 2. Validar que no ha sido reversada anteriormente
-- 3. Crear nueva transacción con:
--    - Mismo tipo (income/expense/transfer)
--    - Mismos montos
--    - Status: 'completed' (auto-aprobada)
--    - Descripción: "REVERSA de [ref]: [razón]"
--    - reversed_by_transaction_id: apunta a original
-- 4. Actualizar transacción original:
--    - status: 'voided'
--    - reversal_transaction_id: apunta a nueva
-- 5. Trigger generate_accounting_entries genera asientos de reversa automáticamente
```

---

## Servicios Angular

### `TransactionApprovalService`

**Archivo**: `src/app/core/services/transaction-approval/transaction-approval.service.ts`

**Propósito**: Gestionar aprobación, anulación y conciliación de transacciones.

#### Métodos:

```typescript
/**
 * Fetch pending transactions for approval.
 * Returns transactions with status = 'pending' for a condominium.
 * @param condominiumId - The condominium ID
 * @returns Array of pending FinancialTransaction
 */
async fetchPending(condominiumId: string): Promise<FinancialTransaction[]>

/**
 * Approve a transaction (pending → completed).
 * Updates wallet balance automatically via trigger.
 * Marks transaction as immutable.
 * @param transactionId - The transaction ID to approve
 */
async approve(transactionId: string): Promise<void>

/**
 * Void a transaction (pending → voided or completed → voided).
 * If completed, creates a reversal transaction automatically.
 * If pending, simply changes status to voided.
 * @param transactionId - The transaction ID to void
 * @param reason - Reason for voiding (audit trail)
 */
async void(transactionId: string, reason: string): Promise<void>

/**
 * Mark transaction as reconciled with bank statement.
 * @param transactionId - The transaction ID to reconcile
 */
async reconcile(transactionId: string): Promise<void>
```

**Estado**:
- `pendingTransactions$: BehaviorSubject<FinancialTransaction[]>` - Lista reactiva de transacciones pendientes
- `loading$: BehaviorSubject<boolean>` - Estado de carga
- `error$: BehaviorSubject<unknown>` - Estado de error

---

## Flujos de Negocio

### Flujo de Aprobación

```
1. Admin crea transacción
   ↓
   financial_transactions INSERT
   status: 'pending'
   approved_at: NULL
   ↓
2. Admin revisa transacciones pendientes
   ↓
   TransactionApprovalService.fetchPending()
   ↓
3. Admin aprueba transacción
   ↓
   TransactionApprovalService.approve(id)
   ↓
   UPDATE financial_transactions SET
     status = 'completed',
     approved_at = now(),
     approved_by = admin_id
   ↓
4. Trigger update_wallet_balance_on_approval se ejecuta
   ↓
   UPDATE condominium_accounts SET
     current_balance = current_balance + amount
   ↓
5. Transacción ahora es inmutable
```

### Flujo de Reversa

```
1. Transacción completada tiene error
   ↓
   TX-001: expense, $500, status: 'completed'
   ↓
2. Admin solicita reversa con razón
   ↓
   TransactionApprovalService.void('TX-001', 'Error en monto')
   ↓
3. RPC create_reversal_transaction se ejecuta
   ↓
   INSERT INTO financial_transactions (
     type: 'expense',
     amount: 500,
     status: 'completed',
     description: 'REVERSA de TX-001: Error en monto',
     reversed_by_transaction_id: 'TX-001'
   )
   ↓
4. Trigger generate_accounting_entries genera asientos de reversa
   ↓
   DÉBITO  $500 → 1.1.02 Banco (revierte crédito original)
   CRÉDITO $500 → 5.1.01 Electricidad (revierte débito original)
   ↓
5. Transacción original se actualiza
   ↓
   UPDATE financial_transactions SET
     status = 'voided',
     reversal_transaction_id = 'TX-002'
   ↓
6. Efecto contable neto: $0 (TX-001 anulada)
```

---

## Tipos TypeScript Actualizados

### `FinancialTransaction` (campos agregados)

```typescript
interface FinancialTransaction {
  // ... campos existentes ...
  
  // Approval fields
  approved_at: string | null;
  approved_by: string | null;
  
  // Reconciliation fields
  reconciled_at: string | null;
  reconciled_by: string | null;
  
  // Reversal fields
  reversal_transaction_id: string | null;
  reversed_by_transaction_id: string | null;
  reversal_reason: string | null;
}
```

---

## Migraciones

| Archivo | Descripción |
|---------|-------------|
| `20260706000001_add_approval_reconciliation_fields.sql` | Columnas de aprobación, conciliación y reversa |
| `20260706000002_update_wallet_balance_on_approval.sql` | Trigger para actualizar saldos |
| `20260706000003_create_reversal_transaction.sql` | Función RPC para crear reversas |

---

## Conciliación Bancaria (MVP)

### Fase 1 (Actual): Manual Simple

- Marcar transacciones como "conciliadas"
- UI muestra transacciones pendientes de conciliación
- Admin compara visualmente con estado de cuenta del banco
- Filtros por fecha, monto, estado de conciliación

### Fase 2 (Posterior): Semi-Automática

- Importación de extractos bancarios (CSV/Excel)
- Algoritmo de coincidencias sugeridas (monto, fecha, referencia)
- Admin revisa y confirma coincidencias

### Fase 3 (Futuro): Automática

- Integración con APIs bancarias (si están disponibles)
- Conciliación en tiempo real

---

## Tests

- **TransactionApprovalService**: Tests para approve, void, reconcile
- **Trigger Tests**: Verificar actualización de saldos
- **Reversal Tests**: Verificar creación de transacción de reversa
- **Cobertura**: 80%+

---

## Dependencias

- **Requiere**: Fase 1, 2, 3
- **No bloquea**: Fase 5 (Saldos y Reportes Legales)
