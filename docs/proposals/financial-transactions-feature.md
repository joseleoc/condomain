# Propuesta: Feature de Transacciones Financieras (Ingresos y Egresos)

**Fecha**: 26 de junio de 2026  
**Última actualización**: 30 de junio de 2026  
**Proyecto**: Condomain — Plataforma de Gestión de Condominios  
**Estado**: Propuesta revisada — modelo híbrido aprobado  
**Fuentes**: Arquitectura Financiera Condomain + Análisis de UX (TimelyBills) + Requisitos Legales

---

## 1. Objetivo

Implementar el módulo de transacciones financieras que permita registrar ingresos y egresos en cada condominio con una **interfaz simplificada** (inspirada en apps de finanzas personales como TimelyBills), manteniendo por detrás el **rigor contable de partida doble** necesario para cumplir con la Ley de Propiedad Horizontal.

### 1.1 Principio Fundamental: Modelo Híbrido

**UI del usuario**: Simple e intuitiva, sin requerir conocimientos de contabilidad
- El usuario ve **billeteras** (donde está el dinero) y **categorías** (para qué se gastó)
- No ve códigos contables, débitos, créditos, ni asientos

**Motor contable interno**: Formal y completo
- El sistema automáticamente genera asientos de partida doble
- Mantiene cuentas contables formales (ocultas al usuario)
- Genera Libro Diario, Libro Mayor, Balance General, Estado de Resultados

### 1.2 ¿Qué NO es este módulo?

- No es una app de finanzas personales. Es contabilidad formal de copropiedad con UI simplificada.
- No permite "ingresé $50 y ya". Cada movimiento tiene origen y destino contable (manejado automáticamente).
- No permite borrar ni modificar transacciones procesadas. Las correcciones son transacciones nuevas de reversa.
- No requiere que el usuario sepa contabilidad. El sistema traduce acciones simples a asientos contables.

---

## 2. Principios de Diseño (y por qué cada uno)

### 2.1 Modelo Híbrido: UI Simple + Motor Contable Formal

**Decisión**: Separar completamente la experiencia de usuario del motor contable interno.

**Capa de Usuario (UI)**:
- **Billeteras** (`condominium_accounts`): Lugares donde vive el dinero (Banco Mercantil USD, Caja Chica, PayPal)
- **Categorías** (`transaction_categories`): Etiquetas para clasificar ingresos/egresos (Electricidad, Alícuotas, Mantenimiento)
- **Transacciones**: El usuario solo especifica monto, billetera, categoría y descripción

**Capa Contable (interna)**:
- **Cuentas contables** (`chart_of_accounts`): Cuentas formales de partida doble (Activos, Pasivos, Ingresos, Egresos)
- **Asientos automáticos**: El sistema traduce cada transacción de usuario en débitos/créditos
- **Códigos contables**: Separados en columna `code` (ej. "5.1.01") para evitar ruido visual en UI

**Por qué**:
- El administrador del condominio NO necesita saber contabilidad
- La UI es intuitiva (similar a TimelyBills, Mint, YNAB)
- El sistema cumple con la Ley de Propiedad Horizontal automáticamente
- Los reportes legales (Libro Diario, Libro Mayor) se generan sin intervención del usuario

**Ejemplo práctico**:
```
Usuario ve: "Gasté $300 en Electricidad desde Banco Mercantil"

Sistema registra internamente:
  DÉBITO  $300 → Cuenta contable "5.1.01 Electricidad" (Egreso)
  CRÉDITO $300 → Cuenta contable "1.1.01 Banco Mercantil USD" (Activo)
```

### 2.2 Billeteras del Condominio (Cuentas de Usuario)

**Decisión**: Los usuarios crean y gestionan billeteras donde el dinero realmente existe.

**Qué son**: Representación digital de los lugares donde el condominio tiene dinero
- Cuentas bancarias (Banco Mercantil, Banco de Venezuela)
- Efectivo (Caja Chica)
- Wallets digitales (PayPal, Zelle)
- Criptomonedas (Binance, si aplica)

**Atributos**:
- Nombre (ej. "Banco Mercantil USD")
- Tipo (bank, cash, wallet, credit)
- Moneda (USD, VES, EUR)
- Institución (opcional, ej. "Banco Mercantil")
- Número de cuenta (opcional, enmascarado en UI)
- Saldo actual (calculado automáticamente)

**Eliminación de Billeteras (Soft Delete)**:
- Las billeteras NO se eliminan físicamente, se marcan con `deleted_at` (soft delete)
- Las transacciones existentes NO se mueven, permanecen vinculadas a la billetera original
- La billetera eliminada NO aparece en requests de UI (filtrada por `deleted_at IS NULL`)
- Las transacciones de billeteras eliminadas NO se muestran directamente en UI
- Los totales y balances se mantienen intactos (trazabilidad preservada)
- El usuario nunca ve billeteras eliminadas, pero los datos históricos permanecen

**Por qué**:
- Modelo mental simple: "¿Dónde está el dinero?"
- Similar a apps de finanzas personales que los usuarios ya conocen
- Flexibilidad para manejar multi-moneda (cada billetera tiene su moneda)
- Trazabilidad garantizada mediante cuentas del sistema

### 2.3 Categorías de Ingresos y Egresos

**Decisión**: Sistema de categorías con estructura padre-hijo de 2 niveles para clasificar transacciones.

**Estructura**:
```
Nivel 1 (Padre)          Nivel 2 (Hijas)
─────────────────        ─────────────────
Servicios Públicos   →   Electricidad, Agua, Gas, Internet
Mantenimiento        →   Ascensores, Áreas Comunes, Piscinas
Ingresos Ordinarios  →   Alícuotas, Fondo de Reserva, Multas
```

**Reglas**:
- ✅ Solo 2 niveles: Padre → Hijas (sin nietos)
- ✅ Categorías predefinidas del sistema (no eliminables)
- ✅ Usuario puede crear categorías padre e hijas adicionales
- ✅ Cada categoría tiene ícono y color para UI
- ✅ Tipo fijo: income o expense (heredado por hijas)

**Categorías del Sistema (predefinidas, no eliminables)**:

**Ingresos**:
- Ingresos Ordinarios (Alícuotas, Fondo de Reserva, Multas)
- Ingresos Extraordinarios (Cuotas Extraordinarias, Alquiler Áreas Comunes)

**Egresos**:
- Servicios Públicos (Electricidad, Agua, Gas, Internet, Aseo)
- Mantenimiento (Ascensores, Áreas Comunes, Piscinas)
- Administración (Honorarios, Sueldos, Prestaciones Sociales)
- Gastos Extraordinarios (Reparaciones Mayores)

**Por qué**:
- Organización lógica sin complejidad excesiva
- Reportes agregados por categoría padre
- Drill-down a subcategorías específicas
- Flexibilidad para que cada condominio cree sus propias categorías
- Íconos y colores mejoran reconocimiento visual en UI

### 2.4 Partida Doble Automática (Motor Contable Interno)

**Decisión**: Todo movimiento financiero genera automáticamente al menos un Débito y un Crédito de igual monto.

**Por qué**: 
- La Ley de Propiedad Horizontal exige libros contables formales (Libro Diario, Libro Mayor)
- La partida doble previene descuadres matemáticamente
- El usuario no necesita entender esto; el sistema lo maneja automáticamente

**Mapeo automático**:

| Acción del Usuario | Débito Automático | Crédito Automático |
|-------------------|-------------------|-------------------|
| Registrar ingreso en billetera | Cuenta contable de la billetera (Activo) | Cuenta contable de la categoría (Ingreso) |
| Registrar egreso desde billetera | Cuenta contable de la categoría (Egreso) | Cuenta contable de la billetera (Activo) |
| Transferir entre billeteras | Cuenta contable billetera destino (Activo) | Cuenta contable billetera origen (Activo) |

**Ejemplo**:
```
Usuario registra: "Pago de electricidad $300 desde Banco Mercantil"

Sistema automáticamente genera:
  DÉBITO  $300 → Cuenta "5.1.01 Electricidad" (Egreso)
  CRÉDITO $300 → Cuenta "1.1.01 Banco Mercantil USD" (Activo)
```

### 2.5 Plan de Cuentas Contable (Interno, Oculto al Usuario)

**Decisión**: Mantener cuentas contables formales con códigos separados de los nombres para generar reportes legales.

**Estructura de códigos** (NO visibles en UI principal):
```
1. ACTIVOS
   1.1 Activo Corriente
       1.1.01 Banco Mercantil USD
       1.1.02 Banco de Venezuela VES
       1.1.03 Caja Chica

5. EGRESOS
   5.1 Servicios Públicos
       5.1.01 Electricidad
       5.1.02 Agua
       5.1.03 Internet
```

**Separación código/nombre**:
- Columna `code`: "5.1.01" (para reportes legales, Libro Mayor)
- Columna `name`: "Electricidad" (para UI, reportes visuales)
- El usuario ve el nombre; el sistema usa el código internamente

**Por qué**:
- Los reportes legales (Libro Mayor) requieren códigos contables
- La UI no debe mostrar códigos (ruido visual)
- Separación permite generar ambos tipos de reportes sin conflicto
- Estándar contable universal usa códigos jerárquicos

### 2.6 Inmutabilidad de Registros

**Decisión**: Las transacciones en estado `completed` o `voided` NO se pueden modificar ni eliminar.

**Por qué**:
- La Ley de Propiedad Horizontal exige que los libros contables reflejen la historia financiera sin alteraciones
- Si se comete un error, la corrección es emitir una **transacción de reversa** que anule el efecto contable
- Esto crea un **trail auditable**: registro original + reversa + corrección

**Máquina de estados**:
```
pending → completed → voided
                     ↗
pending → voided
```

- `pending`: Registrado pero no conciliado. Los balances NO se actualizan.
- `completed`: Conciliado y aprobado. Los balances SÍ se actualizan. **Inmutable a partir de aquí.**
- `voided`: Anulado mediante transacción de reversa. **Inmutable a partir de aquí.**

### 2.7 Multi-moneda Nativa con Doble Almacenamiento

**Decisión**: Cada transacción captura la moneda original, la tasa de cambio del momento, y almacena el monto tanto en divisa original como en moneda base del condominio.

**Por qué**:
- En Venezuela los condominios operan en USD pero reciben pagos en VES, EUR, etc.
- **Doble almacenamiento**: monto original para conciliación bancaria, equivalente en moneda base para estados financieros estables

**Regla**: La tasa de cambio se captura en el momento del registro y es inmutable.

### 2.8 Saldos Mensuales Acumulados (Snapshots)

**Decisión**: Mantener una tabla de saldos mensuales por cuenta contable que se actualiza cuando una transacción pasa a `completed`.

**Por qué**:
- Los dashboards financieros necesitan respuestas en milisegundos
- La tabla de snapshots permite leer un único registro para obtener el saldo del mes en curso
- Para auditorías profundas, siempre se puede calcular desde transacciones individuales

---

## 3. Modelo de Dominio

### 3.1 Entidades

| Entidad | Responsabilidad | Visible al Usuario | Multi-lenguaje | Atributos Clave |
|---------|----------------|-------------------|----------------|-----------------|
| **Condominium** | Nodo raíz, frontera multi-tenant | Sí | Sí (existente) | id, name, address, base_currency |
| **CondominiumAccount** | Billeteras donde vive el dinero | Sí (principal) | No (usuario) | id, condominium_id, name, type, currency, balance, institution, deleted_at |
| **TransactionCategory** | Categorías para clasificar ingresos/egresos | Sí (principal) | Sí (sistema) | id, condominium_id, parent_id, name, name_en, type, icon, color |
| **ChartOfAccountsSystem** | Cuentas contables globales (internas) | No | Sí (sistema) | id, code, name, name_en, type, parent_id |
| **ChartOfAccounts** | Cuentas contables por condominio (internas) | No | Sí (heredado) | id, condominium_id, system_account_id, code, name, name_en, type |
| **FinancialTransaction** | Registro de movimiento financiero | Sí | No | id, condominium_id, account_id, category_id, type, amount, status |
| **FinancialTransactionEntry** | Asiento contable automático (débito/crédito) | No | No | id, transaction_id, account_id, entry_type, amount |
| **AccountMonthlyBalance** | Snapshot de saldo mensual (cuentas contables) | No | No | id, account_id, year, month, initial_balance, final_balance |

### 3.2 Relaciones

```
Condominium (1) ──── (N) CondominiumAccount  [billeteras del condominio]
Condominium (1) ──── (N) TransactionCategory  [categorías del condominio]
Condominium (1) ──── (N) ChartOfAccounts  [cuentas contables del condominio]

ChartOfAccountsSystem (1) ─── (0..N) ChartOfAccountsSystem  [auto-referencial: parent_id]
ChartOfAccountsSystem (1) ──── (0..N) ChartOfAccounts  [referencia global: system_account_id]

TransactionCategory (1) ──── (0..N) TransactionCategory  [auto-referencial: parent_id, máximo 2 niveles]

FinancialTransaction (1) ──── (1..N) FinancialTransactionEntry  [asientos contables]
CondominiumAccount (1) ──── (0..N) FinancialTransaction  [transacciones de la billetera]
TransactionCategory (1) ──── (0..N) FinancialTransaction  [transacciones de la categoría]
ChartOfAccounts (1) ──── (0..N) FinancialTransactionEntry  [asientos de la cuenta contable]
ChartOfAccounts (1) ──── (0..N) AccountMonthlyBalance  [saldos mensuales]
```

---

## 4. Esquema de Base de Datos Propuesto

### 4.1 Tabla: `condominium_accounts` (Billeteras del Condominio)

```sql
CREATE TABLE condominium_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  currency VARCHAR(3) NOT NULL REFERENCES currencies(iso_code),
  institution VARCHAR(100),
  account_number VARCHAR(50),
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_account_type CHECK (type IN ('bank', 'cash', 'wallet', 'credit', 'investment')),
  CONSTRAINT chk_balance_non_negative CHECK (balance >= 0),
  CONSTRAINT chk_name_not_empty CHECK (char_length(trim(name)) > 0)
);
```

**Decisiones explicadas**:
- **Billeteras del usuario**: El administrador crea cuentas donde el dinero realmente existe (bancos, efectivo, wallets)
- `type`: Tipos de billetera (bank, cash, wallet, credit, investment)
- `currency`: Cada billetera tiene su propia moneda (USD, VES, EUR)
- `institution`: Nombre del banco o institución (ej. "Banco Mercantil")
- `account_number`: Número de cuenta (enmascarado en UI por seguridad)
- `balance`: Saldo actual calculado automáticamente (se mantiene aunque la billetera sea eliminada)
- `deleted_at`: Soft delete - la billetera se marca como eliminada pero NO se borra físicamente
- **Comportamiento al eliminar**: 
  - La billetera NO aparece en requests de UI (filtrada por `WHERE deleted_at IS NULL`)
  - Las transacciones existentes NO se mueven, permanecen vinculadas a la billetera original
  - Las transacciones de billeteras eliminadas NO se muestran directamente en UI
  - Los totales y balances se mantienen intactos (trazabilidad preservada)
- **Nota i18n**: Las billeteras son creadas por el usuario, no requieren multi-lenguaje (solo ES)

### 4.2 Tabla: `transaction_categories` (Categorías de Ingresos/Egresos)

```sql
CREATE TABLE transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES transaction_categories(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  description_en TEXT,
  type VARCHAR(10) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  provider_type VARCHAR(50),
  provider_name VARCHAR(100),
  is_system_defined BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_category_type CHECK (type IN ('income', 'expense')),
  CONSTRAINT chk_max_two_levels CHECK (
    parent_id IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM transaction_categories c 
      WHERE c.parent_id = transaction_categories.id
    )
  ),
  CONSTRAINT chk_type_matches_parent CHECK (
    parent_id IS NULL 
    OR type = (SELECT c.type FROM transaction_categories c WHERE c.id = parent_id)
  ),
  CONSTRAINT unique_name_per_parent UNIQUE (condominium_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name),
  CONSTRAINT chk_name_not_empty CHECK (char_length(trim(name)) > 0)
);
```

**Decisiones explicadas**:
- **Estructura padre-hijo de 2 niveles**: Solo padre → hijas (sin nietos)
- `parent_id`: NULL = categoría padre, NOT NULL = subcategoría
- `type`: 'income' o 'expense' (heredado por hijas del padre)
- `icon`: Nombre del ícono (ion-icons) para UI
- `color`: Color hex (ej. '#FF8200') para UI
- `provider_type`: Tipo de proveedor (electricity_company, water_company, others)
- `provider_name`: Nombre del proveedor (ej. 'Corpoelec')
- `is_system_defined`: TRUE = categoría predefinida del sistema (no eliminable)
- **Multi-lenguaje**: `name` (español, default) + `name_en` (inglés, opcional). Lo mismo para `description` / `description_en`
- **Restricción de 2 niveles**: CHECK constraint previene más de 2 niveles
- **Tipo consistente**: Hijas deben tener mismo tipo que padre
- **Categorías del sistema**: Deben tener traducciones ES y EN. Categorías de usuario: solo ES requerido, EN opcional

### 4.3 Tabla: `chart_of_accounts_system` (Cuentas Contables Globales - Internas)

```sql
CREATE TABLE chart_of_accounts_system (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES chart_of_accounts_system(id) ON DELETE RESTRICT,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  type VARCHAR(20) NOT NULL,
  description TEXT,
  description_en TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_account_type CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense'))
);
```

**Decisiones explicadas**:
- **Tabla global interna**: No visible al usuario, usada por el motor contable
- `code`: Código contable jerárquico (ej. "5.1.01") separado del nombre para evitar ruido visual
- `name`: Nombre legible en español (ej. "Electricidad")
- `name_en`: Nombre en inglés (ej. "Electricity") - requerido para cuentas del sistema
- `type`: Tipos contables estándar (asset, liability, equity, income, expense)
- **Multi-lenguaje**: Cuentas del sistema deben tener ES y EN. Usado en reportes legales si el usuario cambia idioma
- **Inmutabilidad**: Solo modificable por administradores de plataforma

### 4.4 Tabla: `chart_of_accounts` (Cuentas Contables por Condominio - Internas)

```sql
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  system_account_id UUID REFERENCES chart_of_accounts_system(id) ON DELETE RESTRICT,
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  type VARCHAR(20) NOT NULL,
  description TEXT,
  description_en TEXT,
  is_system_defined BOOLEAN GENERATED ALWAYS AS (system_account_id IS NOT NULL) STORED,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_code_per_condo UNIQUE (condominium_id, code),
  CONSTRAINT chk_account_type CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense'))
);
```

**Decisiones explicadas**:
- **Cuentas contables internas**: No visibles en UI principal, usadas para asientos automáticos
- `system_account_id`: Referencia a cuenta global del sistema
- `is_system_defined`: Computed column (TRUE si system_account_id IS NOT NULL)
- `code`: Código contable (ej. "5.1.01") para reportes legales
- **Multi-lenguaje**: `name` / `name_en` y `description` / `description_en`. Si viene de system_account, se copian las traducciones
- **Auto-populación**: Trigger crea cuentas automáticamente cuando se crea condominio, copiando traducciones del sistema

### 4.5 Tabla: `financial_transactions` (Transacciones del Usuario)

```sql
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES condominium_accounts(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES transaction_categories(id) ON DELETE RESTRICT,
  type VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  amount NUMERIC(15, 2) NOT NULL,
  original_currency VARCHAR(3) NOT NULL,
  exchange_rate NUMERIC(14, 4) NOT NULL DEFAULT 1.0000,
  description TEXT NOT NULL,
  reference_number VARCHAR(100),
  transaction_date DATE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_tx_type CHECK (type IN ('income', 'expense', 'transfer')),
  CONSTRAINT chk_tx_status CHECK (status IN ('pending', 'completed', 'voided')),
  CONSTRAINT chk_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_exchange_rate CHECK (exchange_rate > 0)
);
```

**Decisiones explicadas**:
- **UI simplificada**: El usuario solo especifica billetera, categoría, monto y descripción
- `account_id`: Billetera de donde sale/entra el dinero
- `category_id`: Categoría que clasifica el propósito
- `type`: 'income', 'expense', o 'transfer' (entre billeteras)
- `status`: pending → completed → voided (inmutable una vez completed/voided)
- **Multi-moneda**: original_currency + exchange_rate para conversión

### 4.6 Tabla: `financial_transaction_entries` (Asientos Contables Automáticos)

```sql
CREATE TABLE financial_transaction_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  entry_type VARCHAR(6) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_entry_type CHECK (entry_type IN ('debit', 'credit')),
  CONSTRAINT chk_amount_positive CHECK (amount >= 0)
);
```

**Decisiones explicadas**:
- **Asientos automáticos**: Generados por el sistema, no por el usuario
- `transaction_id`: FK a la transacción del usuario
- `account_id`: Cuenta contable formal (del chart_of_accounts)
- `entry_type`: 'debit' o 'credit'
- **Validación de partida doble**: suma(debits) = suma(credits) por transacción

### 4.7 Tabla: `account_monthly_balances` (Saldos Mensuales de Cuentas Contables)

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
- **Snapshots mensuales**: Optimización para dashboards y reportes
- `initial_balance + total_debits - total_credits = final_balance`
- Se actualiza cuando transacción pasa a 'completed'

### 4.8 Índices de Rendimiento

```sql
-- Índices para condominium_accounts
CREATE INDEX idx_condo_accounts_condo_id ON condominium_accounts(condominium_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_condo_accounts_type ON condominium_accounts(type) WHERE is_active = true;

-- Índices para transaction_categories
CREATE INDEX idx_tx_categories_condo_id ON transaction_categories(condominium_id) WHERE is_active = true;
CREATE INDEX idx_tx_categories_parent_id ON transaction_categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_tx_categories_type ON transaction_categories(type) WHERE is_system_defined = true;

-- Índices para financial_transactions
CREATE INDEX idx_financial_tx_condo_date ON financial_transactions(condominium_id, transaction_date);
CREATE INDEX idx_financial_tx_account ON financial_transactions(account_id);
CREATE INDEX idx_financial_tx_category ON financial_transactions(category_id);
CREATE INDEX idx_financial_tx_status ON financial_transactions(status) WHERE status = 'pending';

-- Índices para financial_transaction_entries
CREATE INDEX idx_tx_entries_transaction ON financial_transaction_entries(transaction_id);
CREATE INDEX idx_tx_entries_account ON financial_transaction_entries(account_id);

-- Índices para account_monthly_balances
CREATE INDEX idx_monthly_balances_period ON account_monthly_balances(year, month);
CREATE INDEX idx_monthly_balances_account ON account_monthly_balances(account_id);
```

### 4.9 Triggers y Funciones Automáticas

**Función 1**: Auto-popular cuentas contables cuando se crea condominio
```sql
-- Trigger: trg_condominiums_auto_populate_chart_of_accounts
-- Cuando se crea un condominio, automáticamente crea registros en chart_of_accounts
-- referenciando todas las cuentas activas de chart_of_accounts_system
```

**Función 2**: Generar asientos contables automáticamente
```sql
-- Trigger: trg_financial_transactions_generate_entries
-- Cuando se inserta una financial_transaction, automáticamente genera
-- los financial_transaction_entries (débito/crédito) basados en:
-- - type (income/expense/transfer)
-- - account_id (billetera → cuenta contable de activo)
-- - category_id (categoría → cuenta contable de ingreso/egreso)
```

**Función 3**: Actualizar saldo de billetera
```sql
-- Trigger: trg_financial_transactions_update_balance
-- Cuando una transacción pasa a 'completed', actualiza el balance
-- de la condominium_account asociada
```

**Función 4**: Actualizar saldos mensuales
```sql
-- Trigger: trg_financial_transactions_update_monthly_balance
-- Cuando una transacción pasa a 'completed', actualiza
-- account_monthly_balances para las cuentas contables afectadas
```
## 5. Flujos de Negocio

### 5.1 Configuración Inicial (Administrador)

```
1. Administrador crea billeteras del condominio:
   • "Banco Mercantil USD" (type: bank, currency: USD)
   • "Caja Chica" (type: cash, currency: USD)
   • "Banco de Venezuela VES" (type: bank, currency: VES)

2. Sistema automáticamente crea cuentas contables internas:
   • 1.1.01 Banco Mercantil USD (asset)
   • 1.1.02 Caja Chica (asset)
   • 1.1.03 Banco de Venezuela VES (asset)
   • 5.1.01 Electricidad (expense)
   • 5.1.02 Agua (expense)
   • 4.1.01 Alícuotas de Condominio (income)
   • ... (todas las cuentas del sistema)

3. Administrador puede crear categorías adicionales:
   • Categoría padre: "Seguridad" (expense)
   • Subcategoría: "Vigilancia 24h" (expense, parent: Seguridad)
```

### 5.2 Registro de Ingreso (Pago de Alícuota) - UI Simplificada

**Lo que ve el usuario**:
```
┌─────────────────────────────────────────────┐
│  Registrar Ingreso                          │
├─────────────────────────────────────────────┤
│  Monto: [$100.00]                           │
│  Billetera: [Banco Mercantil USD ▼]         │
│  Categoría: [Alícuotas de Condominio ▼]     │
│  Fecha: [30/06/2026]                        │
│  Descripción: [Pago alícuota junio - Apto 1A]│
│  Referencia: [TRF-2026-001234]              │
│                                             │
│         [Cancelar]  [Registrar]             │
└─────────────────────────────────────────────┘
```

**Lo que hace el sistema automáticamente**:
```
1. Crea financial_transaction:
   - account_id: Banco Mercantil USD
   - category_id: Alícuotas de Condominio
   - type: 'income'
   - amount: $100.00
   - status: 'pending'

2. Genera asientos contables automáticos:
   DÉBITO  $100 → Cuenta "1.1.01 Banco Mercantil USD" (Activo)
   CRÉDITO $100 → Cuenta "4.1.01 Alícuotas de Condominio" (Ingreso)

3. Valida partida doble: $100 = $100 ✓

4. Cuando administrador aprueba (status → 'completed'):
   - Actualiza balance de "Banco Mercantil USD": +$100
   - Actualiza account_monthly_balances para cuentas 1.1.01 y 4.1.01
```

### 5.3 Registro de Egreso (Pago de Electricidad) - UI Simplificada

**Lo que ve el usuario**:
```
┌─────────────────────────────────────────────┐
│  Registrar Egreso                           │
├─────────────────────────────────────────────┤
│  Monto: [$300.00]                           │
│  Billetera: [Banco Mercantil USD ▼]         │
│  Categoría: [Electricidad ▼]                │
│  Fecha: [30/06/2026]                        │
│  Descripción: [Pago electricidad junio]     │
│  Referencia: [TRF-2026-001235]              │
│  Proveedor: [Corpoelec]                     │
│                                             │
│         [Cancelar]  [Registrar]             │
└─────────────────────────────────────────────┘
```

**Lo que hace el sistema automáticamente**:
```
1. Crea financial_transaction:
   - account_id: Banco Mercantil USD
   - category_id: Electricidad
   - type: 'expense'
   - amount: $300.00
   - status: 'pending'

2. Genera asientos contables automáticos:
   DÉBITO  $300 → Cuenta "5.1.01 Electricidad" (Egreso)
   CRÉDITO $300 → Cuenta "1.1.01 Banco Mercantil USD" (Activo)

3. Valida partida doble: $300 = $300 ✓

4. Cuando administrador aprueba (status → 'completed'):
   - Actualiza balance de "Banco Mercantil USD": -$300
   - Actualiza account_monthly_balances para cuentas 5.1.01 y 1.1.01
```

### 5.4 Transferencia entre Billeteras

**Lo que ve el usuario**:
```
┌─────────────────────────────────────────────┐
│  Transferir entre Billeteras                │
├─────────────────────────────────────────────┤
│  Monto: [$500.00]                           │
│  De: [Banco Mercantil USD ▼]                │
│  A: [Caja Chica ▼]                          │
│  Fecha: [30/06/2026]                        │
│  Descripción: [Retiro para caja chica]      │
│                                             │
│         [Cancelar]  [Transferir]            │
└─────────────────────────────────────────────┘
```

**Lo que hace el sistema automáticamente**:
```
1. Crea financial_transaction:
   - account_id: Banco Mercantil USD (origen)
   - category_id: NULL (transferencia no usa categoría)
   - type: 'transfer'
   - amount: $500.00
   - status: 'pending'

2. Genera asientos contables automáticos:
   DÉBITO  $500 → Cuenta "1.1.02 Caja Chica" (Activo destino)
   CRÉDITO $500 → Cuenta "1.1.01 Banco Mercantil USD" (Activo origen)

3. Valida partida doble: $500 = $500 ✓

4. Cuando se completa:
   - Banco Mercantil USD: -$500
   - Caja Chica: +$500
```

### 5.5 Pago Multipropósito (Varias Categorías)

**Lo que ve el usuario**:
```
┌─────────────────────────────────────────────┐
│  Registrar Pago Múltiple                    │
├─────────────────────────────────────────────┤
│  Monto Total: [$150.00]                     │
│  Billetera: [Banco Mercantil USD ▼]         │
│                                             │
│  Distribución:                              │
│  ┌─────────────────────────────────────┐   │
│  │ Alícuotas: [$100.00] [Alícuotas ▼] │   │
│  │ Multas: [$30.00] [Multas ▼]        │   │
│  │ Saldo a favor: [$20.00] [Anticipado▼]│  │
│  └─────────────────────────────────────┘   │
│                                             │
│  Descripción: [Pago propietario Apto 1A]    │
│                                             │
│         [Cancelar]  [Registrar]             │
└─────────────────────────────────────────────┘
```

**Lo que hace el sistema automáticamente**:
```
1. Crea financial_transaction (cabecera):
   - account_id: Banco Mercantil USD
   - type: 'income'
   - amount: $150.00
   - status: 'pending'

2. Genera asientos contables automáticos:
   DÉBITO  $150 → Cuenta "1.1.01 Banco Mercantil USD" (Activo)
   CRÉDITO $100 → Cuenta "4.1.01 Alícuotas de Condominio" (Ingreso)
   CRÉDITO $30  → Cuenta "4.1.03 Multas y Recargos" (Ingreso)
   CRÉDITO $20  → Cuenta "2.1.03 Cuotas cobradas por adelantado" (Pasivo)

3. Valida partida doble: $150 = $100 + $30 + $20 ✓
```

### 5.6 Corrección de Error (Transacción de Reversa)

**Escenario**: Administrador registró gasto de $500 por error (debía ser $50)

**Lo que hace el sistema**:
```
1. NO permite modificar la transacción original (TX-001, status: 'completed')

2. Administrador crea transacción de reversa:
   - Selecciona TX-001
   - Click en "Crear reversa"
   - Sistema pre-llena formulario con montos invertidos

3. Sistema genera automáticamente:
   DÉBITO  $500 → Cuenta "1.1.01 Banco Mercantil USD" (revierte crédito original)
   CRÉDITO $500 → Cuenta "5.1.01 Electricidad" (revierte débito original)

4. Efecto contable neto: $0 (transacción original anulada)

5. Administrador registra transacción correcta por $50
```

**Nota**: Si el administrador elimina la billetera "Banco Mercantil USD":
- La billetera se marca con `deleted_at` (soft delete)
- Las transacciones (TX-001, reversa, corrección) permanecen vinculadas a la billetera
- La billetera NO aparece en la UI de selección
- Las transacciones de esta billetera NO se muestran en listados
- El balance histórico se mantiene para trazabilidad

### 5.7 Aprobación y Conciliación

```
1. Transacción creada → status: 'pending'
   - Balance de billetera NO se actualiza
   - Asientos contables generados pero no efectivos

2. Administrador revisa transacciones pendientes:
   - Compara con estado de cuenta bancario
   - Verifica montos y referencias

3. Administrador aprueba → status: 'completed'
   - Balance de billetera SÍ se actualiza
   - Asientos contables se vuelven efectivos
   - AccountMonthlyBalance se actualiza
   - Transacción se vuelve INMUTABLE

4. Si hay error → crear transacción de reversa (no modificar)
```
## 6. Cumplimiento Legal — Ley de Propiedad Horizontal

### 6.1 Libros Contables Obligatorios

La Ley de Propiedad Horizontal exige que el administrador lleve los siguientes libros:

| Libro | Cómo lo satisface el sistema |
|-------|------------------------------|
| **Libro Diario** | Tabla `financial_transactions` + `financial_transaction_entries` ordenadas por `transaction_date`. Cada transacción muestra el asiento completo (débitos y créditos) generado automáticamente. |
| **Libro Mayor** | Tabla `account_monthly_balances` + consulta de `financial_transaction_entries` por `account_id`. Muestra el movimiento de cada cuenta contable individual. |
| **Balance de Comprobación** | Reporte generado desde `account_monthly_balances` que lista todas las cuentas contables con sus saldos débitos y créditos. |
| **Estados Financieros** | Reportes generados desde el árbol de cuentas contables (`chart_of_accounts`): Balance General (Activos, Pasivos, Patrimonio) y Estado de Resultados (Ingresos, Egresos). |

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

### 7.5 Internacionalización (i18n)

**Regla**: Todo contenido creado a nivel de sistema debe tener soporte multi-lenguaje (ES/EN).

**Implementación**:
- **Cuentas del sistema** (`chart_of_accounts_system`): Campos `name` / `name_en` y `description` / `description_en`
- **Categorías del sistema** (`transaction_categories` con `is_system_defined = true`): Campos `name` / `name_en` y `description` / `description_en`
- **Cuentas por condominio** (`chart_of_accounts`): Heredan traducciones del sistema cuando `system_account_id IS NOT NULL`
- **Categorías de usuario**: Solo `name` (ES) requerido, `name_en` opcional
- **Billeteras** (`condominium_accounts`): Solo `name` (ES), no requieren multi-lenguaje (contenido de usuario)

**Frontend (Transloco)**:
- Usar `transloco` pipe/directive para mostrar nombres según idioma activo
- Fallback: Si `name_en` es NULL, mostrar `name` (ES)
- Reportes legales: Usar idioma del usuario al momento de generar el reporte

### 7.6 Telemetría y Analytics

**Objetivo**: Trackear uso del módulo financiero para mejorar UX y detectar problemas.

**Eventos a trackear** (via `TelemetryService`):

| Evento | Propiedades | Trigger |
|--------|-------------|---------|
| `financial_wallet_created` | wallet_type, currency | Usuario crea billetera |
| `financial_category_created` | category_type, is_system_defined, has_parent | Usuario crea categoría |
| `financial_transaction_created` | type, amount, currency, category_type | Usuario registra transacción |
| `financial_transaction_approved` | type, amount, time_to_approve | Admin aprueba transacción |
| `financial_transaction_voided` | original_transaction_id, reason | Admin crea reversa |
| `financial_report_generated` | report_type, date_range | Usuario genera reporte |
| `financial_balance_viewed` | account_id, view_type | Usuario ve saldo de billetera |

**Implementación**:
- Usar `TelemetryService` existente (PostHog)
- No trackear montos exactos (privacidad), solo rangos o flags
- Respetar configuración de opt-in/opt-out del usuario
- Eventos anónimos (sin PII) para usuarios no autenticados

---

## 8. Alcance del Feature (Fases Sugeridas)

### Fase 1: Billeteras y Categorías (Base)
- Crear tabla `condominium_accounts` (billeteras del usuario)
- Crear tabla `transaction_categories` (categorías padre-hijo)
- Implementar CRUD de billeteras (UI tipo TimelyBills)
- Implementar CRUD de categorías (con íconos y colores)
- Cargar categorías predefinidas del sistema (no eliminables)
- UI para gestionar billeteras y categorías

### Fase 2: Transacciones Básicas (UI Simplificada)
- Crear tabla `financial_transactions`
- Implementar registro de ingresos/egresos (UI simple)
- Implementar transferencias entre billeteras
- Validación de montos y selección de billetera/categoría
- UI para listar transacciones con filtros

### Fase 3: Motor Contable Automático (Interno)
- Crear tablas `chart_of_accounts_system` y `chart_of_accounts`
- Implementar auto-populación de cuentas contables al crear condominio
- Implementar generación automática de asientos (financial_transaction_entries)
- Validación de partida doble (suma débitos = suma créditos)
- Actualización automática de saldos de billeteras

### Fase 4: Ciclo de Vida y Conciliación
- Implementar máquina de estados (pending → completed → voided)
- Flujo de aprobación por administrador
- Transacciones de reversa para correcciones
- UI para aprobar/anular transacciones pendientes
- Conciliación manual con estado de cuenta bancario

### Fase 5: Saldos y Reportes Legales
- Crear tabla `account_monthly_balances`
- Implementar actualización automática de saldos mensuales
- Reportes legales: Libro Diario, Libro Mayor
- Reportes financieros: Balance General, Estado de Resultados
- UI de dashboard financiero con gráficos por categoría

### Fase 6: Multi-moneda y Advanced Features
- Implementar captura de tasas de cambio
- Doble almacenamiento de montos (original + base)
- Integración con entidad `Party` (actores externos)
- Conciliación bancaria semi-automática (importación CSV)
- Portal del propietario (self-service)

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
| **Modelo Híbrido** (UI simple + motor contable formal) | Usuario no necesita saber contabilidad, pero el sistema cumple con la Ley de Propiedad Horizontal automáticamente |
| **Billeteras del condominio** (condominium_accounts) | Modelo mental simple: "¿Dónde está el dinero?" Similar a apps de finanzas personales (TimelyBills, Mint) |
| **Categorías padre-hijo de 2 niveles** | Organización lógica sin complejidad excesiva, reportes agregados por padre, drill-down a hijas |
| **Cuentas contables internas** (chart_of_accounts) | Motor de partida doble oculto al usuario, genera Libro Diario/Mayor automáticamente |
| **Código contable separado del nombre** | Columna `code` (ej. "5.1.01") para reportes legales, `name` para UI (sin ruido visual) |
| **Asientos contables automáticos** | El sistema traduce transacciones simples a débitos/créditos automáticamente |
| **Categorías predefinidas del sistema** (no eliminables) | Estandarización, cumplimiento legal, reportes comparativos entre condominios |
| **Inmutabilidad de registros** | Trazabilidad auditable, cumplimiento legal, correcciones vía reversas |
| **Multi-moneda con doble almacenamiento** | Contexto bimonetario (Venezuela), estados financieros estables, conciliación bancaria |
| **Máquina de estados explícita** | Control de ciclo de vida (pending → completed → voided), conciliación, prevención de alteraciones |
| **Aislamiento por condominium_id** | Multi-tenancy seguro, cumplimiento de privacidad entre condominios |
| **Fondo de Reserva híbrido** (automático con override) | Automatización previene errores, flexibilidad para casos excepcionales, cumplimiento legal |
| **Conciliación bancaria diferida** (manual → semi-automática → automática) | MVP primero, aprender del uso real, bancos venezolanos no tienen APIs públicas |
| **Portal del propietario** (self-service) | Cumple derecho de información de Ley de Propiedad Horizontal, escalable |
| **Distribución de gastos en tres niveles** | Condominio, estructura, compartido - todos los gastos se distribuyen proporcionalmente |
| **Presupuestos anuales fuera de scope** (MVP) | MVP enfocado en registro y trazabilidad, presupuestos son enhancement posterior |
| **Pasarelas de pago fuera de scope** (MVP) | MVP enfocado en registro manual, integración con pasarelas es enhancement posterior |
| **Reportes fiscales fuera de scope** (MVP) | MVP enfocado en registro y trazabilidad, reportes SUNAPI/SENIAT son enhancement posterior |

---

## Próximos Pasos

1. **✅ Revisión completada**: Propuesta actualizada con modelo híbrido (UI simple + motor contable formal)
2. **✅ Decisiones tomadas**: Billeteras, categorías de 2 niveles, soft delete, i18n, telemetría
3. **Definir alcance inicial**: ¿Empezamos con Fase 1 (Billeteras y Categorías) para MVP?
4. **SDD formal**: Una vez aprobado el alcance, usar SDD para generar specs, diseño y tareas de implementación.
5. **Migraciones de base de datos**: Crear tablas `condominium_accounts`, `transaction_categories`, `chart_of_accounts_system`, `chart_of_accounts`, `financial_transactions`, `financial_transaction_entries`, `account_monthly_balances`

---

**Nota final**: Esta propuesta está diseñada para ser robusta, auditable y escalable. Cada decisión tiene una justificación técnica y legal. Si algo no te convence o quieres simplificar, dímelo y ajustamos. Es más importante que el sistema sea usable y mantenido que perfecto en teoría.
