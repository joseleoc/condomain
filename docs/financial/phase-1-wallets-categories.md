# Fase 1: Billeteras y Categorías

## Descripción General

La Fase 1 establece la base del módulo financiero implementando dos conceptos fundamentales:

1. **Billeteras** (`condominium_accounts`): Representan los lugares donde el condominio tiene dinero (bancos, efectivo, wallets digitales)
2. **Categorías** (`transaction_categories`): Clasifican el propósito de los ingresos y egresos (electricidad, alícuotas, mantenimiento, etc.)

Esta fase sigue el patrón de apps de finanzas personales como TimelyBills, donde el usuario gestiona "dónde está el dinero" y "para qué se gastó", sin necesidad de conocimientos contables.

---

## Base de Datos

### Tabla: `condominium_accounts` (Billeteras)

**Propósito**: Almacenar las billeteras/cuentas donde el condominio tiene dinero.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, auto-generado |
| `condominium_id` | uuid | FK → condominiums (CASCADE) |
| `name` | text | Nombre de la billetera (ej. "Banco Mercantil USD") |
| `account_type` | text | Tipo: bank, cash, wallet, credit, investment |
| `currency` | varchar(3) | FK → currencies (USD, VES, EUR) |
| `institution_name` | text | Nombre de la institución (ej. "Banco Mercantil") |
| `initial_balance` | numeric(15,2) | Saldo inicial |
| `current_balance` | numeric(15,2) | Saldo actual (se actualiza automáticamente) |
| `icon` | text | Ícono para UI (ion-icons) |
| `color` | text | Color para UI (hex) |
| `chart_account_id` | uuid | FK → chart_of_accounts (mapeo a cuenta contable) |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |
| `deleted_at` | timestamptz | Soft delete |

**Índices**:
- `idx_condominium_accounts_condominium_id` (parcial: WHERE deleted_at IS NULL)
- `idx_condominium_accounts_chart_account_id` (parcial: WHERE chart_account_id IS NOT NULL)

**RLS**:
- SELECT: Miembros del condominio
- INSERT/UPDATE/DELETE: Admin/Operator

---

### Tabla: `transaction_categories` (Categorías)

**Propósito**: Clasificar transacciones por propósito (ingresos/egresos).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, auto-generado |
| `condominium_id` | uuid | FK → condominiums (CASCADE) |
| `parent_id` | uuid | FK → self (jerarquía padre-hijo) |
| `name` | text | Nombre de la categoría |
| `category_type` | text | income o expense |
| `icon` | text | Ícono para UI |
| `color` | text | Color para UI |
| `is_system` | boolean | TRUE = categoría del sistema (no eliminable) |
| `i18n_key` | text | Clave de traducción para categorías del sistema |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Fecha de actualización |
| `deleted_at` | timestamptz | Soft delete |

**Restricciones**:
- Jerarquía de 2 niveles máximo (trigger `check_category_depth`)
- Unique: (condominium_id, name, parent_id) WHERE deleted_at IS NULL

**RLS**:
- SELECT: Miembros del condominio
- INSERT/UPDATE/DELETE: Admin/Operator (bloqueado para is_system = true)

---

### Seed Data: Categorías del Sistema

**Categorías Padre (8)**:
- **Expense**: maintenance, services, administration, security, cleaning
- **Income**: fees, reserves, other_income

**Categorías Hija (ejemplos)**:
- maintenance → common_areas, repairs
- services → electricity, water, gas, internet, phone, waste
- fees → monthly, extraordinary

---

## Servicios Angular

### `CondominiumAccountsService`

**Archivo**: `src/app/core/services/condominium-accounts/condominium-accounts.ts`

**Propósito**: Gestionar billeteras del condominio con soporte offline-first.

#### Métodos:

```typescript
/**
 * Fetch all wallets for a condominium.
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * @param condominiumId - The condominium ID to fetch wallets for
 * @returns Array of CondominiumAccount
 */
async fetchByCondominium(condominiumId: string): Promise<CondominiumAccount[]>

/**
 * Fetch a single wallet by ID.
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * @param id - The wallet ID
 * @returns CondominiumAccount or null
 */
async getById(id: string): Promise<CondominiumAccount | null>

/**
 * Create a new wallet.
 * Online: inserts into Supabase and caches locally.
 * Offline: creates local record and queues mutation for sync.
 * @param data - Wallet creation data
 * @returns Created CondominiumAccount
 */
async create(data: CreateCondominiumAccountData): Promise<CondominiumAccount>

/**
 * Update an existing wallet.
 * Online: updates in Supabase with optimistic local update.
 * Offline: updates local cache and queues mutation for sync.
 * @param id - The wallet ID to update
 * @param data - Partial wallet data to update
 */
async update(id: string, data: Partial<CreateCondominiumAccountData>): Promise<void>

/**
 * Soft-delete a wallet.
 * Online: calls RPC function to set deleted_at.
 * Offline: updates local cache and queues mutation for sync.
 * @param id - The wallet ID to delete
 */
async delete(id: string): Promise<void>
```

**Estado**:
- `accounts$: BehaviorSubject<CondominiumAccount[]>` - Lista reactiva de billeteras
- `loading$: BehaviorSubject<boolean>` - Estado de carga
- `error$: BehaviorSubject<unknown>` - Estado de error

---

### `TransactionCategoriesService`

**Archivo**: `src/app/core/services/transaction-categories/transaction-categories.ts`

**Propósito**: Gestionar categorías de ingresos/egresos con jerarquía de 2 niveles.

#### Métodos:

```typescript
/**
 * Fetch all categories for a condominium.
 * Online: queries Supabase and caches locally.
 * Offline: reads from IndexedDB cache.
 * @param condominiumId - The condominium ID
 * @returns Array of TransactionCategory
 */
async fetchByCondominium(condominiumId: string): Promise<TransactionCategory[]>

/**
 * Fetch categories filtered by type (income/expense) as a tree structure.
 * Returns parent categories with children array populated.
 * @param condominiumId - The condominium ID
 * @param type - 'income' or 'expense'
 * @returns Array of CategoryTreeNode (parent with children)
 */
async fetchByType(condominiumId: string, type: 'income' | 'expense'): Promise<CategoryTreeNode[]>

/**
 * Fetch direct children of a parent category.
 * @param parentId - The parent category ID
 * @returns Array of child categories
 */
async fetchChildren(parentId: string): Promise<TransactionCategory[]>

/**
 * Create a new category.
 * Validates hierarchy (max 2 levels) before creation.
 * Online: inserts into Supabase.
 * Offline: creates local record and queues mutation.
 * @param data - Category creation data
 * @returns Created TransactionCategory
 */
async create(data: CreateTransactionCategoryData): Promise<TransactionCategory>

/**
 * Update an existing category.
 * Rejects if category is system-defined (is_system = true).
 * @param id - The category ID
 * @param data - Partial category data
 */
async update(id: string, data: Partial<CreateTransactionCategoryData>): Promise<void>

/**
 * Soft-delete a category.
 * Rejects if category is system-defined.
 * @param id - The category ID
 */
async delete(id: string): Promise<void>
```

**Validaciones**:
- Jerarquía máxima de 2 niveles (padre → hijos, sin nietos)
- Categorías del sistema no se pueden modificar ni eliminar
- Hijas deben tener mismo tipo que padre (income/expense)

---

## Tipos TypeScript

### `CondominiumAccount`

```typescript
interface CondominiumAccount {
  id: string;
  condominium_id: string;
  name: string;
  account_type: 'bank' | 'cash' | 'wallet' | 'credit' | 'investment';
  currency: string;
  institution_name: string | null;
  initial_balance: number;
  current_balance: number;
  icon: string | null;
  color: string | null;
  chart_account_id: string | null;  // FK to chart_of_accounts
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

### `TransactionCategory`

```typescript
interface TransactionCategory {
  id: string;
  condominium_id: string;
  parent_id: string | null;
  name: string;
  category_type: 'income' | 'expense';
  icon: string | null;
  color: string | null;
  is_system: boolean;
  i18n_key: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

### `CategoryTreeNode`

```typescript
interface CategoryTreeNode extends TransactionCategory {
  children: TransactionCategory[];
}
```

---

## Migraciones

| Archivo | Descripción |
|---------|-------------|
| `20260701000000_financial_wallets_categories.sql` | Tablas, RLS, triggers, seed data |
| `20260706000000_add_chart_account_id_to_condominium_accounts.sql` | FK directa a chart_of_accounts |

---

## Tests

- **CondominiumAccountsService**: 22 tests (online/offline fetch, create, update, delete, telemetry)
- **TransactionCategoriesService**: 22 tests (tree building, hierarchy validation, system protection, offline)
- **Cobertura**: 80%+

---

## Dependencias

- **Requiere**: Tabla `condominiums`, `currencies`, `profile_condominiums`
- **No bloquea**: Fase 2 (Transacciones Básicas)
