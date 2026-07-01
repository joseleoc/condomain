# Transaction Categories Specification

## Purpose

Category management — how money is classified. DB schema, 2-level hierarchy, system seeding, offline-first CRUD, UI, telemetry.

## Requirements

### Requirement: Database Schema — `transaction_categories`

Table `transaction_categories`:

| Column | Type | Constraint |
|--------|------|-----------|
| `id` | `uuid` | PK |
| `condominium_id` | `uuid` | NOT NULL, FK→`condominiums(id)` CASCADE |
| `parent_id` | `uuid` | NULLABLE, FK→self SET NULL |
| `name` | `text` | NOT NULL, non-empty |
| `category_type` | `text` | IN (`income`,`expense`) |
| `icon`/`color` | `text` | NULLABLE |
| `is_system` | `boolean` | DEFAULT false |
| `i18n_key` | `text` | NULLABLE (system only) |
| `created_at`/`updated_at` | `timestamptz` | auto-trigger |
| `deleted_at` | `timestamptz` | NULLABLE |

Constraints: no self-ref, max 2 levels via trigger. Partial unique `(condo_id, name, parent_id) WHERE deleted_at IS NULL`. RLS: members SELECT, admin/operator CUD. System rows blocked from DELETE. RPC: `soft_delete_category`. Sync entity: `'transaction_category'`.

#### Scenario: 3rd level rejected
- GIVEN root A → child B
- WHEN insert with `parent_id = B.id`
- THEN rejected

#### Scenario: System delete blocked
- GIVEN `is_system = true`
- WHEN DELETE via RLS
- THEN blocked

---

### Requirement: System Category Seeding

Idempotent trigger on `condominiums` INSERT (`ON CONFLICT DO NOTHING`). System parents: expense: `maintenance`, `services`, `administration`, `security`, `cleaning`; income: `fees`, `reserves`, `other_income`. Children defined per parent (e.g., maintenance→`common_areas`,`repairs`). All have `is_system=true` + `i18n_key`. Translations in `i18n/{es,en}.json` under `financial.categories.system.*`.

#### Scenario: Seed on creation
- GIVEN new condo
- THEN system categories inserted with hierarchy

#### Scenario: Idempotent
- GIVEN categories exist, seed runs again
- THEN no duplicates

---

### Requirement: TypeScript Interface

`TransactionCategory` in `src/app-types/transaction-categories.ts`, exported via `index.ts`. Fields mirror DB. `category_type: 'income'|'expense'`. `CreateTransactionCategoryData = Pick<..., 'condominium_id'|'parent_id'|'name'|'category_type'|'icon'|'color'>`. `CategoryTreeNode = TransactionCategory & {children: TransactionCategory[]}`.

#### Scenario: Type parity
- THEN all columns match nullability

---

### Requirement: `TransactionCategories` Service

`@Injectable({providedIn:'root'})`, `inject()`. Deps: `Supabase`, `NetworkStatusService`, `LocalRepository`, `SyncService`.

| Method | Behavior |
|--------|---------|
| `fetchByCondominium(id)` | Online: Supabase. Offline: cache. |
| `fetchByType(id, type)` | Filter type, return `CategoryTreeNode[]`. |
| `fetchChildren(parentId)` | Direct children. |
| `create(data)` | Validate hierarchy, online insert or offline enqueue. |
| `update(id, data)` | Reject if system. Optimistic → sync. |
| `delete(id)` | Reject if system. Soft-delete or enqueue. |

Hierarchy: if `parent_id` set, parent must have `parent_id IS NULL`. State: `BehaviorSubject<TransactionCategory[]>`, loading$, error$. Telemetry: `FINANCIAL_CATEGORY_CREATED` tracked with `{category_type, is_child, is_system, condominium_id}`. SyncService RPC: `transaction_category` → create/update/delete mapped to idempotent RPCs.

#### Scenario: Fetch builds tree
- GIVEN 2 roots with 3+2 children
- WHEN `fetchByType('c1','expense')`
- THEN 2 nodes with correct children

#### Scenario: Child-of-child rejected
- GIVEN root A → child B
- WHEN `create({parent_id: B.id})`
- THEN error "Max 2 levels"

#### Scenario: System delete rejected
- GIVEN `is_system = true`
- WHEN `delete(id)`
- THEN error, no mutation

#### Scenario: Offline queues
- GIVEN offline, `create(data)`
- THEN local pending + mutation enqueued

---

### Requirement: Category UI Components

Standalone under `src/app/features/financial/`:

| Component | Path | Role |
|-----------|------|------|
| `CategoryListPage` | `pages/category-list/` | Container: tabs, grid |
| `CategoryGroup` | `components/category-group/` | Root + children |
| `CategoryCard` | `components/category-card/` | Icon, name, badge |
| `CategoryFormModal` | `components/category-form-modal/` | Form: name, type, icon/color, parent |

System: lock icon, edit/delete disabled. Parent selector: roots only. Transloco: `financial.categories.*`. System names via `i18n_key`. ES/EN translations for all keys.

#### Scenario: Grouped render
- GIVEN 2 roots with children
- THEN 2 `CategoryGroup` with nested children

#### Scenario: System locked
- GIVEN system category
- THEN lock icon, delete disabled

#### Scenario: Parent filters
- GIVEN creating child
- THEN only roots of same type shown
