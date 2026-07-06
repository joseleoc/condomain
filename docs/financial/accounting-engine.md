# Accounting Engine - Documentación Técnica

## Descripción General

El **Accounting Engine** es el motor contable que genera automáticamente asientos de partida doble cuando se crea una transacción financiera en el sistema. Implementado como **Postgres Trigger**, garantiza consistencia atómica y cumple con los requisitos legales de la Ley de Propiedad Horizontal.

---

## Arquitectura

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTE (Angular)                                          │
│  - Valida datos de entrada                                  │
│  - Muestra preview de asientos (opcional)                   │
│  - Envía transacción al servidor                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  POSTGRES TRIGGER (generate_accounting_entries)             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 1. Busca cuenta contable de la billetera              │ │
│  │ 2. Busca cuenta contable de la categoría              │ │
│  │ 3. Genera asientos débito/crédito                     │ │
│  │ 4. Valida partida doble (debits = credits)            │ │
│  │ 5. Todo en una transacción atómica                    │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementación

### Ubicación

- **Migración**: `supabase/migrations/20260703000004_accounting_engine_trigger.sql`
- **Función**: `public.generate_accounting_entries()`
- **Trigger**: `trg_generate_accounting_entries`

### Tablas Involucradas

| Tabla | Rol |
|-------|-----|
| `financial_transactions` | Tabla principal donde se dispara el trigger |
| `condominium_accounts` | Billeteras del usuario (mapeo a cuentas contables) |
| `chart_of_accounts` | Cuentas contables por condominio |
| `chart_of_accounts_system` | Cuentas contables globales del sistema |
| `transaction_categories` | Categorías de ingresos/egresos |
| `financial_transaction_entries` | Asientos contables generados |

---

## Lógica de Mapeo

### Billetera → Cuenta Contable

El sistema mapea el `account_type` de la billetera a códigos de cuentas contables:

| Wallet Type | Código Cuenta | Tipo Cuenta | Descripción |
|-------------|---------------|-------------|-------------|
| `bank` | `1.1.02` | Asset | Banco |
| `cash` | `1.1.01` | Asset | Caja Chica |
| `wallet` | `1.1.01` | Asset | Caja Chica (billeteras digitales) |
| `credit` | `2.1.01` | Liability | Fondo de Reserva (pasivo) |
| `investment` | `1.1.02` | Asset | Banco (inversiones) |

### Categoría → Cuenta Contable

El sistema busca la cuenta contable de dos formas:

1. **Por `system_account_id`**: Si la categoría tiene una referencia a una cuenta del sistema
2. **Por nombre**: Fallback que busca coincidencia de nombre entre categoría y cuenta contable

---

## Reglas de Partida Doble

### Ingreso (Income)

```
DÉBITO  → Cuenta de Activo (billetera)     [aumenta el activo]
CRÉDITO → Cuenta de Ingreso (categoría)    [registra el ingreso]
```

**Ejemplo**: Propietario paga $100 de alícuota
```
DÉBITO  $100 → 1.1.02 Banco (activo aumenta)
CRÉDITO $100 → 4.1.01 Alícuotas de Condominio (ingreso)
```

### Egreso (Expense)

```
DÉBITO  → Cuenta de Egreso (categoría)     [registra el gasto]
CRÉDITO → Cuenta de Activo (billetera)     [disminuye el activo]
```

**Ejemplo**: Pago de electricidad $300
```
DÉBITO  $300 → 5.1.01 Electricidad (gasto)
CRÉDITO $300 → 1.1.02 Banco (activo disminuye)
```

### Transferencia (Transfer)

```
DÉBITO  → Cuenta de Activo destino         [aumenta activo destino]
CRÉDITO → Cuenta de Activo origen          [disminuye activo origen]
```

**Ejemplo**: Transferencia $500 de Banco a Caja Chica
```
DÉBITO  $500 → 1.1.01 Caja Chica (activo aumenta)
CRÉDITO $500 → 1.1.02 Banco (activo disminuye)
```

---

## Validaciones

### 1. Partida Doble Balanceada

```sql
IF abs(total_debits - total_credits) > 0.01 THEN
    RAISE EXCEPTION 'Double-entry validation failed';
END IF;
```

**Tolerancia**: $0.01 para manejar redondeos de decimales.

### 2. Monto Correcto

```sql
IF abs(total_debits - transaction.base_amount) > 0.01 THEN
    RAISE EXCEPTION 'Entry amount mismatch';
END IF;
```

**Validación**: La suma de débitos debe igualar el monto de la transacción.

### 3. Existencia de Cuentas

- ✅ Billetera debe existir en `condominium_accounts`
- ✅ Cuenta contable de billetera debe existir en `chart_of_accounts`
- ✅ Cuenta contable de categoría debe existir (para ingresos/egresos)

---

## Manejo de Errores

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Wallet not found` | Billetera eliminada o no existe | Verificar `account_id` |
| `No chart_of_accounts entry found for wallet type` | No hay cuenta contable para ese tipo de billetera | Crear cuenta contable con código apropiado |
| `Category required for income/expense` | Transacción de ingreso/egreso sin categoría | Proporcionar `category_id` |
| `No chart_of_accounts entry found for category` | Categoría no mapeada a cuenta contable | Crear cuenta contable o vincular categoría |
| `Double-entry validation failed` | Error en lógica de generación | Revisar trigger function |

### Comportamiento ante Fallos

- **Transacción atómica**: Si el trigger falla, la transacción completa se revierte
- **No hay transacciones huérfanas**: Imposible tener transacción sin asientos
- **Logs de error**: Los errores se registran en Postgres logs

---

## Offline-First Compatibility

### ¿Cómo funciona con offline?

1. **Cliente offline**: Crea transacción localmente con `_local_status: 'pending'`
2. **Sincronización**: Cuando vuelve online, `SyncService` envía la transacción al servidor
3. **Trigger se ejecuta**: Al insertar en Supabase, el trigger genera los asientos automáticamente
4. **Consistencia garantizada**: No importa si el cliente estaba offline, los asientos siempre se generan

### Ventajas sobre Client-Side

| Aspecto | Client-Side | Server-Side (Trigger) |
|---------|-------------|----------------------|
| **Atomicidad** | ❌ Puede fallar | ✅ Garantizada |
| **Offline** | ❌ No genera asientos | ✅ Se ejecuta en sync |
| **Seguridad** | ⚠️ Puede ser bypassed | ✅ Siempre se ejecuta |
| **Performance** | ❌ Múltiples requests | ✅ Un solo request |
| **Consistencia** | ⚠️ Eventual | ✅ Inmediata |

---

## Testing

### Tests de Base de Datos

```sql
-- Test 1: Crear ingreso y verificar asientos
INSERT INTO financial_transactions (condominium_id, account_id, category_id, type, amount, base_amount, ...)
VALUES (...);

SELECT * FROM financial_transaction_entries WHERE transaction_id = last_inserted_id;
-- Expected: 2 entries (1 debit, 1 credit)

-- Test 2: Validar partida doble
SELECT 
    SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) as total_debits,
    SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) as total_credits
FROM financial_transaction_entries 
WHERE transaction_id = last_inserted_id;
-- Expected: total_debits = total_credits
```

### Tests de Integración (Angular)

```typescript
it('should generate accounting entries when creating transaction', async () => {
  const transaction = await service.create({
    condominium_id: '...',
    account_id: '...',
    category_id: '...',
    type: 'income',
    amount: 100,
    ...
  });

  // Verificar que la transacción se creó
  expect(transaction.id).toBeDefined();

  // Los asientos se generan automáticamente en el servidor
  // No necesitamos verificar en el cliente
});
```

---

## Mantenimiento

### Agregar Nuevo Tipo de Billetera

1. Actualizar el `CASE` statement en `generate_accounting_entries()`
2. Agregar mapeo a código de cuenta contable
3. Crear tests para el nuevo tipo

### Modificar Reglas de Partida Doble

1. Editar la función `generate_accounting_entries()`
2. Actualizar la documentación
3. Ejecutar tests de regresión

### Debugging

```sql
-- Ver asientos de una transacción específica
SELECT 
    fte.entry_type,
    fte.amount,
    ca.code,
    ca.name
FROM financial_transaction_entries fte
JOIN chart_of_accounts ca ON ca.id = fte.account_id
WHERE fte.transaction_id = 'transaction-uuid-here';

-- Ver transacciones sin asientos (no debería haber ninguna)
SELECT ft.id, ft.type, ft.amount
FROM financial_transactions ft
LEFT JOIN financial_transaction_entries fte ON fte.transaction_id = ft.id
WHERE fte.id IS NULL AND ft.deleted_at IS NULL;
```

---

## Migración y Rollback

### Aplicar Migración

```bash
npx supabase db push --local
```

### Rollback (si es necesario)

```sql
-- Eliminar trigger
DROP TRIGGER IF EXISTS trg_generate_accounting_entries ON financial_transactions;

-- Eliminar función
DROP FUNCTION IF EXISTS generate_accounting_entries();

-- Eliminar asientos existentes (opcional)
DELETE FROM financial_transaction_entries;
```

---

## Referencias

- **Ley de Propiedad Horizontal**: Exige libros contables formales con partida doble
- **Propuesta Original**: `docs/proposals/financial-transactions-feature.md`
- **Specs**: `openspec/changes/financial-accounting-engine/specs/`
- **Design**: `openspec/changes/financial-accounting-engine/design.md`

---

## Changelog

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2026-07-03 | 1.0.0 | Implementación inicial con Postgres Trigger |
| 2026-07-06 | 1.1.0 | Documentación técnica completa |
