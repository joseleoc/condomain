# Condominium Accounts Specification

## Purpose

Wallet (account) management — where money lives. Covers DB schema, offline-first CRUD service, UI, and telemetry.

## Requirements

### Requirement: Database Schema — `condominium_accounts`

The system SHALL create table `condominium_accounts`:

| Column | Type | Constraint |
|--------|------|-----------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `condominium_id` | `uuid` | NOT NULL, FK→`condominiums(id)` CASCADE |
| `name` | `text` | NOT NULL, CHECK non-empty |
| `account_type` | `text` | NOT NULL, IN (`bank`,`cash`,`wallet`,`credit`,`investment`) |
| `currency` | `varchar(3)` | NOT NULL, FK→`currencies(iso_code)` |
| `institution_name` | `text` | NULLABLE |
| `initial_balance` | `numeric(15,2)` | DEFAULT 0 |
| `current_balance` | `numeric(15,2)` | DEFAULT 0 |
| `icon` | `text` | NULLABLE |
| `color` | `text` | NULLABLE |
| `created_at`/`updated_at` | `timestamptz` | NOT NULL, auto-trigger |
| `deleted_at` | `timestamptz` | NULLABLE |

Indexes: partial unique `(condominium_id, name) WHERE deleted_at IS NULL`. RLS enabled — SELECT for members, CUD for admin/operator. RPC: `soft_delete_account(uuid, text)`. Sync entity type: `'account'`.

#### Scenario: Soft delete allows name reuse
- GIVEN account "Banco XYZ" soft-deleted
- WHEN new "Banco XYZ" created in same condo
- THEN insert succeeds

#### Scenario: RLS blocks non-member
- GIVEN non-member queries condo X accounts
- THEN zero rows returned

---

### Requirement: TypeScript Interface

`CondominiumAccount` in `src/app-types/condominium-accounts.ts`, exported via `index.ts`. Fields mirror DB columns 1:1. `account_type` is union literal `'bank'|'cash'|'wallet'|'credit'|'investment'`. `CreateCondominiumAccountData = Pick<CondominiumAccount, 'condominium_id'|'name'|'account_type'|'currency'|'institution_name'|'initial_balance'|'icon'|'color'>`.

#### Scenario: Type parity
- GIVEN interface vs DB schema comparison
- THEN all columns match with correct nullability

---

### Requirement: `CondominiumAccounts` Service

`@Injectable({providedIn:'root'})`, `inject()` DI. Deps: `Supabase`, `NetworkStatusService`, `LocalRepository`, `SyncService`.

| Method | Online | Offline |
|--------|--------|---------|
| `fetchByCondominium(id)` | Supabase query, cache via `upsert('account',...)` | `getEntitiesByType('account')`, filter by condo |
| `getById(id)` | Supabase `.single()`, cache | `getById('account', id)` |
| `create(data)` | Supabase insert, cache | UUID + `_local_status:'pending'`, enqueue |
| `update(id,data)` | Optimistic local → Supabase. Revert on error | Optimistic local → enqueue |
| `delete(id)` | Optimistic `deleted_at` → RPC `soft_delete_account`. Revert on error | Optimistic → enqueue |

State: `BehaviorSubject<CondominiumAccount[]>`, loading$`, `error$`.

#### Scenario: Fetch online caches locally
- GIVEN online, `fetchByCondominium('c1')` called
- THEN Supabase returns non-deleted accounts, each upserted to LocalRepository

#### Scenario: Fetch offline reads cache
- GIVEN offline, 3 accounts cached
- THEN returns 3 cached accounts filtered by `condominium_id`

#### Scenario: Create offline queues mutation
- GIVEN offline, `create(data)` called
- THEN local account created with `_local_status:'pending'`, mutation enqueued

#### Scenario: Update reverts on error
- GIVEN online, Supabase returns error
- THEN local cache reverted, error thrown

#### Scenario: Delete uses soft delete RPC
- GIVEN online, `delete(id)` called
- THEN optimistic `deleted_at` set, RPC invoked; on failure, reverted

---

### Requirement: Wallet UI Components

Standalone components under `src/app/features/financial/`:

| Component | Path | Role |
|-----------|------|------|
| `WalletListPage` | `pages/wallet-list/` | Container: fetch, display, states |
| `WalletCard` | `components/wallet-card/` | Card: name, type icon, balance, currency |
| `WalletFormModal` | `components/wallet-form-modal/` | Modal: create/edit form |

Uses `ion-list` + `ion-item-sliding`. Delete requires confirmation alert. Reactive forms with `ControlContainer`. Transloco keys: `financial.wallets.*`. SCSS: Ionic CSS vars only.

#### Scenario: Populated state
- GIVEN 2 accounts returned
- THEN 2 `WalletCard` components rendered

#### Scenario: Empty state
- GIVEN 0 accounts
- THEN empty message + "Create Wallet" button shown

#### Scenario: Loading state
- GIVEN `loading$` is true
- THEN `ion-spinner` shown, no cards

#### Scenario: Form validation
- GIVEN form open, submit with empty name
- THEN validation error, no submit

---

### Requirement: Telemetry

Add `FINANCIAL_WALLET_CREATED: 'financial_wallet_created'` to `TelemetryEvents`. `create()` calls `TelemetryService.track()` with `{account_type, currency, condominium_id}`.

#### Scenario: Track on creation
- GIVEN wallet created successfully
- THEN event fired with type, currency, condo_id

---

### Requirement: Routes

Lazy-load in `app.routes.ts` under `isNotAuthenticatedGuard`: `/financial/wallets` → `WalletListPage` via `loadComponent()`.

#### Scenario: Route resolves
- GIVEN authenticated user navigates to `/financial/wallets`
- THEN `WalletListPage` lazy-loaded
