# Propuesta: Feature de Transacciones Financieras (Ingresos y Egresos)

**Fecha**: 26 de junio de 2026  
**Proyecto**: Condomain — Plataforma de Gestión de Condominios  
**Estado**: Propuesta inicial — pendiente de revisión  
**Fuentes**: Arquitectura Financiera Condomain + Esquema de Base de Datos SQL

---

## 1. Objetivo

Implementar el módulo de transacciones financieras que permita registrar ingresos y egresos en cada condominio, manteniendo trazabilidad completa, rigor contable de partida doble, y cumplimiento de los requerimientos de la Ley de Propiedad Horizontal.

### 1.1 ¿Qué NO es este módulo?

- No es una app de finanzas personales. Es contabilidad formal de copropiedad.
- No permite "ingresé $50 y ya". Cada movimiento tiene origen y destino contable.
- No permite borrar ni modificar transacciones procesadas. Las correcciones son transacciones nuevas de reversa.

---

## 2. Principios de Diseño (y por qué cada uno)

### 2.1 Partida Doble (Doble Entrada)

**Decisión**: Todo movimiento financiero genera al menos un Débito y un Crédito de igual monto.

**Por qué**: 
- La Ley de Propiedad Horizontal exige libros contables formales (Libro Diario, Libro Mayor). La partida doble es el estándar contable universal que garantiza que cada transacción esté balanceada.
- Previene descuadres **matemáticamente**: si suma(débitos) ≠ suma(créditos), el backend rechaza el registro antes de escribirlo.
- La interfaz de usuario puede ser simple ("registrar gasto de $300"), pero el motor contable siempre opera con asientos completos.

**Ejemplo práctico**:
```
Administrador registra: "Pago de electricidad $300 vía transferencia"

El sistema genera internamente:
  DÉBITO  $300 → Cuenta "Gasto: Servicios Públicos: Electricidad"
  CRÉDITO $300 → Cuenta "Activo: Banco Custodia"
```

### 2.2 Plan de Cuentas Jerárquico (árbol)

**Decisión**: Las cuentas contables se organizan en árbol con profundidad dinámica, no en categorías planas.

**Por qué**:
- Las categorías planas ("luz", "agua", "limpieza") no escalan. Un condominio grande puede necesitar 50+ subcategorías.
- El árbol permite **drill-down**: ver el total de "Mantenimiento" y hacer click para ver "Ascensores", "Piscina", "Iluminación".
- Los reportes financieros se generan por **agregación recursiva hacia arriba**: un gasto en "5.2.01 Ascensores" suma automáticamente a "5.2 Mantenimiento Técnico" y a "5. EGRESOS".
- La Ley de Propiedad Horizontal exige presentar estados financieros desagregados. El árbol satisface esto nativamente.

**Estructura propuesta**:
```
1. ACTIVOS
   1.1 Activo Corriente
       1.1.01 Banco Custodia USD
       1.1.02 Banco Custodia VES
       1.1.03 Caja Chica
   1.2 Cuentas por Cobrar
       1.2.01 Apto 1A - Cuotas pendientes
       1.2.02 Apto 2B - Cuotas pendientes

2. PASIVOS
   2.1 Pasivo Corriente
       2.1.01 Fondo de Reserva
       2.1.02 Fondo de Prestaciones Sociales
       2.1.03 Cuotas cobradas por adelantado

3. PATRIMONIO
   3.1 Capital del Condominio

4. INGRESOS
   4.1 Ingresos Ordinarios
       4.1.01 Alícuotas de Condominio
       4.1.02 Fondo de Reserva (aportes)
       4.1.03 Multas y Recargos
   4.2 Ingresos Extraordinarios
       4.2.01 Cuotas Extraordinarias
       4.2.02 Alquiler de Áreas Comunes

5. EGRESOS
   5.1 Servicios Públicos
       5.1.01 Electricidad
       5.1.02 Agua
       5.1.03 Telefonía/Internet
   5.2 Mantenimiento
       5.2.01 Ascensores
       5.2.02 Áreas Comunes
       5.2.03 Piscinas
   5.3 Administración
       5.3.01 Honorarios Administrador
       5.3.02 Sueldos y Salarios
       5.3.03 Prestaciones Sociales
   5.4 Gastos Extraordinarios
       5.4.01 Reparaciones Mayores
```

**Gobierno de datos — Dos niveles de cuentas**:

1. **Cuentas del sistema (globales)**: Definidas UNA SOLA VEZ en una tabla separada (`chart_of_accounts_system`). Son inmutables desde el lado del condominio. Todos los condominios comparten las mismas cuentas del sistema. Si la ley cambia o el sistema necesita actualizar una cuenta, se modifica UN solo registro y se refleja en todos los condominios inmediatamente.

2. **Cuentas del condominio (específicas)**: Cada condominio tiene su propia tabla `chart_of_accounts` que referencia las cuentas del sistema (cuando aplica) o define cuentas propias creadas por el administrador. Las cuentas del sistema son inmutables del lado del condominio (no se pueden modificar ni eliminar). El administrador solo puede crear cuentas adicionales para necesidades específicas.

**¿Por qué esta separación?**
- **Sin duplicación**: Las cuentas del sistema no se replican por cada condominio.
- **Mantenibilidad centralizada**: Actualizaciones legales o del sistema se aplican una vez.
- **Estandarización garantizada**: Todos los condominios usan las mismas cuentas obligatorias.
- **Reportes comparativos**: Comparar gastos entre condominios es trivial porque las cuentas son idénticas.
- **Cumplimiento legal**: Las cuentas obligatorias por ley no pueden ser accidentalmente modificadas.

### 2.3 Inmutabilidad de Registros

**Decisión**: Las transacciones en estado `completed` o `voided` NO se pueden modificar ni eliminar.

**Por qué**:
- La Ley de Propiedad Horizontal exige que los libros contables reflejen la historia financiera sin alteraciones. Un auditor externo o la junta fiscalizadora deben poder verificar que ningún registro fue modificado después del hecho.
- Si se comete un error (ej. registrar $500 en vez de $50), la corrección es emitir una **transacción de reversa** (Nota de Crédito/Débito) que anule el efecto contable del registro original.
- Esto crea un **trail auditable**: cualquier persona puede ver el registro original, la transacción de reversa, y la transacción correcta. La historia queda intacta.

**Máquina de estados**:
```
pending → completed → voided
                     ↗
pending → voided
```

- `pending`: Registrado pero no conciliado. Los balances NO se actualizan.
- `completed`: Conciliado y aprobado. Los balances SÍ se actualizan. **Inmutable a partir de aquí.**
- `voided`: Anulado mediante transacción de reversa. **Inmutable a partir de aquí.**

### 2.4 Multi-moneda Nativa con Doble Almacenamiento

**Decisión**: Cada transacción captura la moneda original, la tasa de cambio del momento, y almacena el monto tanto en divisa original como en moneda base del condominio.

**Por qué**:
- En Venezuela (y muchos países con inflación alta o bimonetarismo), los condominios operan en USD pero reciben pagos en VES, EUR, etc.
- Si solo guardáramos el monto en la moneda original, los reportes consolidados serían imposibles.
- Si solo guardáramos el monto en moneda base, perderíamos la trazabilidad del monto real pagado.
- **Doble almacenamiento** resuelve ambos: el monto original para conciliación bancaria, y el equivalente en moneda base para estados financieros estables.

**Regla**: La tasa de cambio se captura en el momento del registro y es inmutable. No se recalcula retroactivamente.

### 2.5 Patrón Cabecera-Detalle

**Decisión**: Cada evento económico tiene una cabecera (FinancialTransaction) y una o más líneas de detalle (FinancialTransactionDetail).

**Por qué**:
- **Gastos consolidados**: Un pago de $300 a Corpoelec puede desglosarse en $200 para "Electricidad Bombas" y $100 para "Iluminación Común". Una cabecera, dos detalles.
- **Pagos multipropósito**: Un propietario paga $150 que cubren $100 de alícuota del mes, $30 de multa pendiente, y $20 quedan como saldo a favor. Una cabecera, tres detalles.
- Sin este patrón, tendríamos que crear transacciones separadas artificialmente, perdiendo la relación lógica entre los movimientos.

### 2.6 Saldos Mensuales Acumulados (Snapshots)

**Decisión**: Mantener una tabla de saldos mensuales por cuenta que se actualiza cuando una transacción pasa a `completed`.

**Por qué**:
- Con años de transacciones, calcular el saldo actual sumando todas las líneas en tiempo real sería lentísimo.
- Los dashboards financieros necesitan respuestas en milisegundos.
- La tabla de snapshots permite leer un único registro para obtener el saldo del mes en curso.
- Para auditorías profundas, siempre se puede hacer el cálculo detallado desde las transacciones individuales.

---

## 3. Modelo de Dominio

### 3.1 Entidades

| Entidad | Responsabilidad | Atributos Clave |
|---------|----------------|-----------------|
| **Condominium** | Nodo raíz, frontera multi-tenant | id, name, address, base_currency |
| **ChartOfAccountsSystem** | Cuentas globales del sistema (compartidas) | id, parent_id (auto-ref), code, name, type, is_active |
| **ChartOfAccounts** | Cuentas por condominio (referencia sistema o propias) | id, condominium_id, system_account_id, parent_id (auto-ref), code, name, type, is_system_defined (computed) |
| **FinancialTransaction** | Cabecera del evento económico | id, condominium_id, actor_id, type, status, description, reference_number, payment_method, original_currency, exchange_rate, transaction_date, created_by |
| **FinancialTransactionDetail** | Líneas del asiento contable | id, transaction_id, account_id, entry_type (debit/credit), amount_original_currency, amount_base_currency |
| **AccountMonthlyBalance** | Snapshot de saldo mensual | id, account_id, year, month, initial_balance, total_debits, total_credits, final_balance |
| **Party** (futuro) | Actores externos (propietarios, proveedores) | id, identification, contact_info, role |

### 3.2 Relaciones

```
ChartOfAccountsSystem (1) ──── (0..N) ChartOfAccountsSystem  [auto-referencial: parent_id]
ChartOfAccountsSystem (1) ──── (0..N) ChartOfAccounts  [referencia global: system_account_id]
Condominium (1) ──── (N) ChartOfAccounts
ChartOfAccounts (1) ──── (0..N) ChartOfAccounts  [auto-referencial: parent_id]
Condominium (1) ──── (N) FinancialTransaction
FinancialTransaction (1) ──── (1..N) FinancialTransactionDetail
ChartOfAccounts (1) ──── (0..N) FinancialTransactionDetail
ChartOfAccounts (1) ──── (0..N) AccountMonthlyBalance
```

---

## 4. Esquema de Base de Datos Propuesto

### 4.1 Tabla: `chart_of_accounts_system` (Cuentas Globales del Sistema)

```sql
CREATE TABLE chart_of_accounts_system (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES chart_of_accounts_system(id) ON DELETE RESTRICT,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_account_type CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense'))
);
```

**Decisiones explicadas**:
- **Tabla global**: No tiene `condominium_id`. Las cuentas del sistema se definen UNA SOLA VEZ y son compartidas por todos los condominios.
- `code` UNIQUE global: El código contable (ej. "2.1.01 Fondo de Reserva") es único en todo el sistema. No puede haber dos cuentas con el mismo código.
- `parent_id` con `ON DELETE RESTRICT`: No puedes eliminar una cuenta padre si tiene hijos. Protege la integridad del árbol global.
- `is_active`: Permite desactivar cuentas del sistema sin eliminarlas (útil si la ley cambia).
- **Inmutabilidad**: Esta tabla solo se modifica mediante migraciones del sistema o por administradores de plataforma. Los administradores de condominios NO tienen acceso a modificar esta tabla.

### 4.2 Tabla: `chart_of_accounts` (Cuentas por Condominio)

```sql
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  system_account_id UUID REFERENCES chart_of_accounts_system(id) ON DELETE RESTRICT,
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  is_system_defined BOOLEAN GENERATED ALWAYS AS (system_account_id IS NOT NULL) STORED,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_code_per_condo UNIQUE (condominium_id, code),
  CONSTRAINT chk_account_type CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense'))
);
```

**Decisiones explicadas**:
- `system_account_id`: Referencia a la cuenta global del sistema. Si es NOT NULL, esta cuenta es una referencia a una cuenta del sistema (inmutable). Si es NULL, es una cuenta creada por el usuario (modificable).
- `is_system_defined` como GENERATED ALWAYS: Este campo se calcula automáticamente. Si `system_account_id IS NOT NULL`, entonces `is_system_defined = true`. No se puede modificar manualmente.
- `parent_id` con `ON DELETE RESTRICT`: No puedes eliminar una cuenta padre si tiene hijos. Protege la integridad del árbol del condominio.
- `code` único por condominio: El código contable debe ser único dentro de cada condominio (no globalmente, porque cada condominio puede tener su propia numeración para cuentas propias).
- **Inmutabilidad del lado del condominio**: Si `is_system_defined = true`, el administrador del condominio NO puede modificar ni eliminar esta cuenta. Solo puede leerla y usarla en transacciones.
- `type` con CHECK constraint: Solo los 5 tipos contables estándar. No se permiten tipos inventados.

**Flujo de creación**:
1. Cuando se crea un nuevo condominio, el sistema automáticamente crea registros en `chart_of_accounts` referenciando todas las cuentas activas de `chart_of_accounts_system`.
2. El administrador puede crear cuentas adicionales (con `system_account_id = NULL`) para necesidades específicas.
3. Las cuentas del sistema son accesibles mediante `WHERE is_system_defined = true` (optimizado con índice).

### 4.2 Tabla: `financial_transactions`

```sql
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES actors(id) ON DELETE RESTRICT,
  type VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  description TEXT NOT NULL,
  reference_number VARCHAR(100),
  payment_method VARCHAR(30) NOT NULL,
  original_currency VARCHAR(5) NOT NULL,
  exchange_rate NUMERIC(14, 4) NOT NULL DEFAULT 1.0000,
  transaction_date DATE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_tx_type CHECK (type IN ('income', 'expense')),
  CONSTRAINT chk_tx_status CHECK (status IN ('pending', 'completed', 'voided')),
  CONSTRAINT chk_exchange_rate CHECK (exchange_rate > 0)
);
```

**Decisiones explicadas**:
- `actor_id` con `ON DELETE RESTRICT`: No puedes eliminar un actor (proveedor/propietario) si tiene transacciones asociadas. Protege la trazabilidad.
- `status` con máquina de estados explícita: Solo 3 estados. La transición de estados se controla a nivel de servicio, no de base de datos.
- `exchange_rate` con CHECK > 0: La tasa de cambio siempre debe ser positiva. Se captura en el momento del registro.
- `transaction_date` separado de `created_at`: La fecha del hecho económico puede ser diferente a la fecha de registro en el sistema (ej. registrar hoy un pago que se hizo ayer).
- `reference_number`: Número de transferencia, cheque, recibo o factura. Esencial para conciliación bancaria y auditoría.

### 4.3 Tabla: `financial_transaction_details`

```sql
CREATE TABLE financial_transaction_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  entry_type VARCHAR(6) NOT NULL,
  amount_original_currency NUMERIC(15, 2) NOT NULL,
  amount_base_currency NUMERIC(15, 2) NOT NULL,

  CONSTRAINT chk_entry_type CHECK (entry_type IN ('debit', 'credit')),
  CONSTRAINT chk_amounts_positive CHECK (amount_original_currency >= 0 AND amount_base_currency >= 0)
);
```

**Decisiones explicadas**:
- `transaction_id` con `ON DELETE CASCADE`: Si eliminas una transacción cabecera (solo en estado `pending`), sus detalles se eliminan automáticamente.
- `account_id` con `ON DELETE RESTRICT`: No puedes eliminar una cuenta contable si tiene movimientos asociados.
- `amounts_positive`: Los montos siempre son positivos. El signo contable lo determina `entry_type` (debit/credit). Esto evita confusión y errores de doble negación.
- `NUMERIC(15, 2)`: Precisión financiera. No usar `FLOAT` o `REAL` nunca para dinero.

### 4.4 Tabla: `account_monthly_balances`

```sql
CREATE TABLE account_monthly_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL,
  initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_debits NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_credits NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  final_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_account_period UNIQUE (account_id, year, month),
  CONSTRAINT chk_month_range CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT chk_year_valid CHECK (year >= 2020)
);
```

**Decisiones explicadas**:
- `unique_account_period`: Una cuenta solo puede tener un registro por mes. Evita duplicados.
- `initial_balance + total_debits - total_credits = final_balance`: Esta relación se valida a nivel de servicio. El `final_balance` del mes anterior es el `initial_balance` del mes siguiente.
- `year >= 2020`: Validación de rango razonable. No esperamos transacciones antes de 2020.

### 4.5 Índices de Rendimiento

```sql
-- Índice para filtrar rápidamente cuentas del sistema vs cuentas propias
CREATE INDEX idx_accounts_system_defined ON chart_of_accounts(is_system_defined) WHERE is_system_defined = true;

-- Índices para transacciones
CREATE INDEX idx_tx_condo_date ON financial_transactions(condominium_id, transaction_date);
CREATE INDEX idx_tx_details_account ON financial_transaction_details(account_id);

-- Índices para saldos mensuales
CREATE INDEX idx_balances_period ON account_monthly_balances(year, month);
```

**Por qué estos índices**:
- `idx_accounts_system_defined`: Índice parcial (filtered index) que solo indexa las cuentas del sistema (`is_system_defined = true`). Permite filtrar rápidamente las cuentas inmutables del sistema sin escanear toda la tabla. Útil para mostrar el plan de cuentas del sistema en la UI.
- `idx_tx_condo_date`: El reporte más común es "flujo de caja de este condominio en este mes". Este índice lo resuelve en milisegundos.
- `idx_tx_details_account`: Para calcular el saldo analítico de una cuenta específica (drill-down).
- `idx_balances_period`: Para cargar estados financieros comparativos (mes actual vs mes anterior).

---

## 5. Flujos de Negocio

### 5.1 Registro de Ingreso (Pago de Alícuota)

```
1. Propietario reporta pago de $100 (alícuota mensual) vía transferencia bancaria.
2. Sistema crea FinancialTransaction:
   - type: 'income'
   - status: 'pending'
   - original_currency: 'USD'
   - exchange_rate: 1.0000
   - transaction_date: hoy
   
3. Sistema crea FinancialTransactionDetail (2 líneas):
   - Línea 1: DÉBITO $100 → Cuenta "1.1.01 Banco Custodia USD"
   - Línea 2: CRÉDITO $100 → Cuenta "1.2.01 Apto 1A - Cuotas pendientes"
   
4. Validación: suma(débitos) = suma(créditos) → $100 = $100 ✓
5. Transacción guardada en estado 'pending'. Balances NO se actualizan.

6. Administrador concilia con estado de cuenta bancario.
7. Administrador aprueba transacción → status cambia a 'completed'.
8. Sistema actualiza AccountMonthlyBalance:
   - Cuenta "1.1.01": total_debits += $100
   - Cuenta "1.2.01": total_credits += $100
```

### 5.2 Registro de Egreso (Pago de Electricidad)

```
1. Administrador registra pago de $300 a Corpoelec vía transferencia.
2. Sistema crea FinancialTransaction:
   - type: 'expense'
   - status: 'pending'
   - original_currency: 'USD'
   - exchange_rate: 1.0000
   - reference_number: 'TRF-2026-001234'
   
3. Sistema crea FinancialTransactionDetail (2 líneas):
   - Línea 1: DÉBITO $300 → Cuenta "5.1.01 Electricidad"
   - Línea 2: CRÉDITO $300 → Cuenta "1.1.01 Banco Custodia USD"
   
4. Validación: suma(débitos) = suma(créditos) → $300 = $300 ✓
5. Administrador aprueba → status: 'completed'
6. Balances actualizados.
```

### 5.3 Corrección de Error (Transacción de Reversa)

```
1. Administrador registró gasto de $500 por error (debía ser $50).
   Transacción original: TX-001, status: 'completed'
   
2. NO se puede modificar TX-001. Sistema obliga a crear transacción de reversa.

3. Sistema crea FinancialTransaction:
   - type: 'expense'
   - status: 'pending'
   - description: 'REVERSA de TX-001: Error en monto'
   - reference_number: 'REV-TX-001'
   
4. Sistema crea FinancialTransactionDetail (2 líneas, invertidas):
   - Línea 1: CRÉDITO $500 → Cuenta "5.1.01 Electricidad" (revierte el débito original)
   - Línea 2: DÉBITO $500 → Cuenta "1.1.01 Banco Custodia USD" (revierte el crédito original)
   
5. Administrador aprueba → status: 'completed'
6. Efecto contable neto: $0 (la transacción original queda anulada)

7. Administrador registra la transacción correcta por $50.
```

### 5.4 Pago Multipropósito

```
1. Propietario paga $150 que cubren:
   - $100 de alícuota del mes corriente
   - $30 de multa pendiente
   - $20 quedan como saldo a favor
   
2. Sistema crea FinancialTransaction:
   - type: 'income'
   - status: 'pending'
   - original_currency: 'USD'
   
3. Sistema crea FinancialTransactionDetail (4 líneas):
   - Línea 1: DÉBITO $150 → Cuenta "1.1.01 Banco Custodia USD"
   - Línea 2: CRÉDITO $100 → Cuenta "4.1.01 Alícuotas de Condominio"
   - Línea 3: CRÉDITO $30 → Cuenta "4.1.03 Multas y Recargos"
   - Línea 4: CRÉDITO $20 → Cuenta "2.1.03 Cuotas cobradas por adelantado"
   
4. Validación: suma(débitos) = suma(créditos) → $150 = $150 ✓
```

---

## 6. Cumplimiento Legal — Ley de Propiedad Horizontal

### 6.1 Libros Contables Obligatorios

La Ley de Propiedad Horizontal exige que el administrador lleve los siguientes libros:

| Libro | Cómo lo satisface el sistema |
|-------|------------------------------|
| **Libro Diario** | Tabla `financial_transactions` + `financial_transaction_details` ordenadas por `transaction_date`. Cada transacción muestra el asiento completo (débitos y créditos). |
| **Libro Mayor** | Tabla `account_monthly_balances` + consulta de detalles por `account_id`. Muestra el movimiento de cada cuenta individual. |
| **Balance de Comprobación** | Reporte generado desde `account_monthly_balances` que lista todas las cuentas con sus saldos débitos y créditos. |
| **Estados Financieros** | Reportes generados desde el árbol de cuentas: Balance General (Activos, Pasivos, Patrimonio) y Estado de Resultados (Ingresos, Egresos). |

### 6.2 Fondos Obligatorios

La Ley exige fondos específicos que deben estar reflejados en el plan de cuentas:

| Fondo | Cuenta Propuesta | Tipo |
|-------|------------------|------|
| **Fondo de Reserva** | 2.1.01 | Pasivo (obligación del condominio) |
| **Fondo de Prestaciones Sociales** | 2.1.02 | Pasivo (obligación con trabajadores) |

**Regla de negocio**: Cada vez que se cobra una alícuota, un porcentaje (definido por el condominio, típicamente 10-20%) debe destinarse al Fondo de Reserva. Esto se puede automatizar con un detalle adicional en la transacción de ingreso.

### 6.3 Derecho de Información

Los copropietarios tienen derecho a:
- Consultar el estado financiero del condominio.
- Ver el detalle de ingresos y egresos.
- Recibir estados financieros anuales.

**Implicación técnica**: El sistema debe proveer vistas diferenciadas:
- **Administrador**: Acceso completo a todas las cuentas y transacciones.
- **Propietario**: Acceso solo a información de su propiedad (cuotas pagadas, saldo a favor) y estados financieros consolidados del condominio (no detalles sensibles).

### 6.4 Inmutabilidad y Auditoría

La Ley exige que los registros contables no sean alterados. Nuestro sistema garantiza esto mediante:
- Transacciones en estado `completed` o `voided` son inmutables (validación a nivel de servicio + base de datos).
- Correcciones mediante transacciones de reversa (trail auditable).
- Campos `created_by` y `created_at` en todas las transacciones (trazabilidad de autoría).

---

## 7. Consideraciones Técnicas

### 7.1 Multi-tenancy y Aislamiento

**Regla**: Toda consulta, inserción y actualización debe filtrar por `condominium_id`.

**Implementación**:
- Servicios de Angular inyectan el `condominium_id` del contexto del usuario autenticado.
- Supabase RLS (Row Level Security) policies deben reforzar el aislamiento a nivel de base de datos.
- No se permite acceso cruzado entre condominios.

### 7.2 Precisión Numérica

**Regla**: Nunca usar `FLOAT` o `REAL` para montos financieros.

**Implementación**:
- Base de datos: `NUMERIC(15, 2)` para montos, `NUMERIC(14, 4)` para tasas de cambio.
- TypeScript: Usar `number` con cuidado (JavaScript tiene problemas de precisión con decimales). Para cálculos críticos, considerar librerías como `decimal.js` o `big.js`.
- Validación a nivel de servicio: `Math.abs(suma_debitos - suma_creditos) < 0.01` (tolerancia por redondeo).

### 7.3 Concurrencia y Consistencia

**Problema**: Dos administradores aprueban transacciones simultáneamente que afectan la misma cuenta.

**Solución**:
- Transacciones de base de datos con aislamiento `SERIALIZABLE` o `REPEATABLE READ`.
- Bloqueo optimista (optimistic locking) en `account_monthly_balances` con campo `version` o `updated_at`.
- Si hay conflicto, el segundo commit falla y el cliente debe reintentar.

### 7.4 Validaciones de Integridad

**Antes de insertar una transacción**:
1. Validar que `suma(débitos) = suma(créditos)` (partida doble balanceada).
2. Validar que todas las cuentas pertenecen al mismo condominio.
3. Validar que la tasa de cambio es positiva.
4. Validar que los montos son no negativos.
5. Validar que el actor (si existe) pertenece al condominio.

**Antes de cambiar estado a `completed`**:
1. Validar que la transacción está balanceada.
2. Validar que todas las cuentas están activas (`is_active = true`).
3. Actualizar `account_monthly_balances` en la misma transacción de base de datos.

---

## 8. Alcance del Feature (Fases Sugeridas)

### Fase 1: Plan de Cuentas (Chart of Accounts)
- Crear tabla `chart_of_accounts`.
- Implementar servicio de gestión del árbol (CRUD de cuentas).
- Cargar plantilla base de cuentas del sistema.
- UI para visualizar y administrar el árbol de cuentas.

### Fase 2: Transacciones Básicas
- Crear tablas `financial_transactions` y `financial_transaction_details`.
- Implementar servicio de registro de ingresos y egresos.
- Validación de partida doble balanceada.
- UI para crear y listar transacciones.

### Fase 3: Ciclo de Vida y Conciliación
- Implementar máquina de estados (pending → completed → voided).
- Flujo de aprobación por administrador.
- Transacciones de reversa para correcciones.
- UI para aprobar/anular transacciones.

### Fase 4: Saldos y Reportes
- Crear tabla `account_monthly_balances`.
- Implementar actualización automática de saldos.
- Reportes financieros básicos: Balance General, Estado de Resultados.
- UI de dashboard financiero con drill-down.

### Fase 5: Multi-moneda y Actores
- Implementar captura de tasas de cambio.
- Doble almacenamiento de montos.
- Integración con entidad `Party` (actores externos).
- Conciliación bancaria asistida.

---

## 9. Preguntas Abiertas para tu Revisión

### ✅ 1. Fondo de Reserva — DECIDIDO: Híbrido (automático con override)

**Decisión**: Sistema híbrido que automatiza el cálculo del Fondo de Reserva pero permite override manual.

**Comportamiento**:
- El administrador configura el porcentaje global del Fondo de Reserva por condominio (ej. 15%)
- Al registrar un pago de alícuota, el sistema **automáticamente**:
  - Calcula el monto del Fondo de Reserva
  - Sugiere la distribución contable (ej. $85 a ingresos operativos, $15 a fondo de reserva)
- El administrador puede **modificar manualmente** si es necesario (pagos parciales, acuerdos especiales)
- El sistema **valida** que la distribución al Fondo de Reserva cumpla el mínimo legal
- El override queda registrado en la auditoría (quién, cuándo, por qué)

**Justificación**: Automatización previene errores y garantiza cumplimiento legal, pero la flexibilidad de override es necesaria para casos excepcionales del mundo real.

---

### ✅ 2. Conciliación bancaria — DECIDIDO: Diferida (evolución por fases)

**Decisión**: Empezar con conciliación manual simple y evolucionar hacia semi-automática en fases posteriores.

**Evolución planificada**:

**Fase 1 (MVP): Manual simple**
- Implementar capacidad de marcar transacciones como "conciliadas"
- UI simple que muestra transacciones pendientes de conciliación
- Administrador compara visualmente con estado de cuenta del banco
- Filtro por fecha, monto, estado de conciliación

**Fase 2 (posterior): Semi-automática**
- Agregar importación de extractos bancarios (CSV/Excel)
- Algoritmo de coincidencias sugeridas (por monto, fecha, referencia)
- Administrador revisa y confirma coincidencias
- Sistema marca transacciones como conciliadas automáticamente tras confirmación

**Fase 3 (opcional, futuro): Automática**
- Solo si bancos venezolanos ofrecen APIs públicas
- Integración con servicios de agregación bancaria (si están disponibles)
- Conciliación en tiempo real

**Justificación**:
- Bancos venezolanos generalmente no tienen APIs públicas (opción C inviable ahora)
- No bloquear lanzamiento del feature financiero por funcionalidad avanzada
- Aprender del uso real antes de invertir en automatización
- Evolución natural según necesidades reales de usuarios

### ✅ 3. Notificaciones a propietarios — DECIDIDO: Portal del propietario (self-service)

**Decisión**: Implementar portal del propietario donde puede consultar su información financiera, en lugar de notificaciones push automáticas.

**Funcionalidades del portal**:
- Ver sus pagos registrados
- Ver el estado de cada pago (pendiente, aprobado, rechazado)
- Descargar recibos
- Ver su historial de pagos
- Consultar saldo a favor (si aplica)
- Ver cuotas pendientes

**Justificación**:
- **Cumplimiento legal**: La Ley de Propiedad Horizontal exige que el propietario pueda consultar el estado financiero. Un portal satisface esto nativamente.
- **Self-service**: El propietario no depende del administrador para verificar sus pagos.
- **Escalabilidad**: Si tienes 100 propietarios, no quieres enviar 100 notificaciones por cada pago. El portal es más eficiente.
- **Evolución natural**: Una vez que el portal funciona, se pueden agregar notificaciones opcionales sin rehacer nada.

**Enhancement futuro (opcional)**:
- Notificaciones básicas opcionales (email/SMS cuando su pago es aprobado)
- El propietario configura qué notificaciones quiere recibir

### ✅ 4. Distribución de gastos entre estructuras — DECIDIDO: Tres niveles con distribución automática

**Decisión**: Todos los gastos se distribuyen entre estructuras (y por ende entre propietarios), con diferentes criterios según el tipo de gasto.

**Tres niveles de gastos**:

**1. Gastos del condominio (gastos generales)**: Se distribuyen automáticamente entre estructuras según alícuota de cada estructura
- Honorarios administrador
- Seguro general del condominio
- Gastos legales
- **Se registran en el condominio, pero se distribuyen para cálculo de alícuotas**

**2. Gastos de estructura (gastos específicos)**: Se asignan a una estructura específica
- Reparación ascensor Torre A
- Electricidad Torre B
- Limpieza Torre C
- **Solo los propietarios de esa estructura pagan**

**3. Gastos compartidos**: Se distribuyen entre estructuras según criterio específico (prorrata)
- Vigilancia (beneficia a todas las estructuras)
- Limpieza de áreas comunes
- Mantenimiento de techos compartidos
- **Se distribuyen según prorrata (número de propiedades, área construida, etc.)**

**Ejemplo práctico**:
```
Condominio "Residencial Las Palmas" tiene:
- Torre A: 10 apartamentos, alícuota 40%
- Torre B: 8 apartamentos, alícuota 35%
- Torre C: 7 apartamentos, alícuota 25%

Gasto del condominio: Honorarios administrador $300
Distribución automática:
- Torre A: $120 (40%)
- Torre B: $105 (35%)
- Torre C: $75 (25%)

Luego, dentro de Torre A:
- Apto 1A1 (alícuota interna 10%): paga $12
- Apto 1A2 (alícuota interna 10%): paga $12
- ... etc
```

**Justificación**:
- **Refleja la realidad**: Hay gastos que son del condominio, gastos que son de una estructura específica, y gastos que se comparten.
- **Automatización**: La distribución automática reduce trabajo manual.
- **Granularidad**: Puedes ver reportes por condominio Y por estructura.
- **Cumplimiento legal**: La Ley de Propiedad Horizontal exige que los gastos se distribuyan proporcionalmente.
- **Todos pagan su parte**: No hay gastos "huérfanos" que nadie pague.

### 🚫 5. Presupuestos anuales — FUERA DE SCOPE (MVP)

**Decisión**: No implementar presupuestos anuales en el MVP actual.

**Razón**: El MVP se enfoca en registro de transacciones y trazabilidad. Los presupuestos son un enhancement posterior.

**Documentación**: Ver [docs/backlog/annual-budgets.md](../backlog/annual-budgets.md) para requerimiento completo y alternativas consideradas.

**Prioridad futura**: Alta (requerimiento legal de la Ley de Propiedad Horizontal)

**Nota temporal**: Administradores pueden hacer presupuestos en Excel hasta que se implemente esta funcionalidad.

### 🚫 6. Integración con pasarelas de pago — FUERA DE SCOPE (MVP)

**Decisión**: No integrar pasarelas de pago en el MVP actual.

**Razón**: El MVP se enfoca en registro de transacciones y trazabilidad. La integración con pasarelas es un enhancement posterior.

**Documentación**: Ver [docs/backlog/payment-gateway-integration.md](../backlog/payment-gateway-integration.md) para requerimiento completo y alternativas consideradas.

**Prioridad futura**: Media-Alta (diferenciador competitivo, mejora experiencia del propietario)

**Nota temporal**: Administradores registran pagos manualmente después de recibir comprobantes de propietarios.

### 🚫 7. Reportes fiscales (SUNAPI / SENIAT) — FUERA DE SCOPE (MVP)

**Decisión**: No generar reportes fiscales oficiales en el MVP actual.

**Razón**: El MVP se enfoca en registro de transacciones y trazabilidad. Los reportes fiscales son un enhancement posterior.

**Documentación**: Ver [docs/backlog/fiscal-reports-sunapi-seniat.md](../backlog/fiscal-reports-sunapi-seniat.md) para requerimiento completo y alternativas consideradas.

**Prioridad futura**: Alta (obligación legal de los condominios)

**Nota temporal**: Administradores exportan datos a Excel y preparan reportes manualmente hasta que se implemente esta funcionalidad.

---

## 10. Resumen de Decisiones Clave

| Decisión | Justificación |
|----------|---------------|
| Partida doble | Estándar contable universal, previene descuadres, cumple Ley de Propiedad Horizontal |
| Plan de cuentas jerárquico | Permite drill-down, reportes agregados, flexibilidad para cada condominio |
| Cuentas del sistema globales + cuentas por condominio | Sin duplicación, actualizaciones centralizadas, estandarización garantizada, reportes comparativos |
| Inmutabilidad de registros | Trazabilidad auditable, cumplimiento legal, correcciones vía reversas |
| Multi-moneda con doble almacenamiento | Contexto bimonetario, estados financieros estables, conciliación bancaria |
| Patrón cabecera-detalle | Flexibilidad para gastos consolidados y pagos multipropósito |
| Saldos mensuales acumulados | Optimización de lectura para dashboards, auditoría detallada bajo demanda |
| Máquina de estados explícita | Control de ciclo de vida, conciliación, prevención de alteraciones |
| Aislamiento por condominium_id | Multi-tenancy seguro, cumplimiento de privacidad entre condominios |
| Fondo de Reserva híbrido (automático con override) | Automatización previene errores, flexibilidad para casos excepcionales, cumplimiento legal garantizado |
| Conciliación bancaria diferida (manual → semi-automática → automática) | MVP primero, aprender del uso real, bancos venezolanos no tienen APIs públicas |
| Portal del propietario (self-service) | Cumple derecho de información de Ley de Propiedad Horizontal, self-service, escalable, evolución natural hacia notificaciones opcionales |
| Distribución de gastos en tres niveles (condominio, estructura, compartido) | Todos los gastos se distribuyen entre estructuras y propietarios, automatización reduce errores, granularidad para reportes por condominio y estructura |
| Presupuestos anuales fuera de scope (MVP) | MVP enfocado en registro y trazabilidad, presupuestos son enhancement posterior (requerimiento legal documentado en backlog) |
| Pasarelas de pago fuera de scope (MVP) | MVP enfocado en registro manual, integración con pasarelas es enhancement posterior (diferenciador competitivo documentado en backlog) |
| Reportes fiscales fuera de scope (MVP) | MVP enfocado en registro y trazabilidad, reportes oficiales SUNAPI/SENIAT son enhancement posterior (obligación legal documentada en backlog) |

---

## Próximos Pasos

1. **Tu revisión**: Lee esta propuesta, haz cambios, pregunta dudas, ajusta lo que necesites.
2. **Responder preguntas abiertas**: Las 7 preguntas de la sección 9 guiarán decisiones de implementación.
3. **Definir alcance inicial**: ¿Empezamos con Fase 1 (Plan de Cuentas) o prefieres un MVP más pequeño?
4. **SDD formal**: Una vez aprobada la propuesta, podemos usar SDD para generar specs, diseño y tareas de implementación.

---

**Nota final**: Esta propuesta está diseñada para ser robusta, auditable y escalable. Cada decisión tiene una justificación técnica y legal. Si algo no te convence o quieres simplificar, dímelo y ajustamos. Es más importante que el sistema sea usable y mantenido que perfecto en teoría.
