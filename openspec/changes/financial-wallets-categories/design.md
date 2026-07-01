# Design: Financial Wallets & Categories (Phase 1 MVP)

## Technical Approach

Two offline-first services (`CondominiumAccounts`, `TransactionCategories`) following the `Structures` service pattern: `inject()` DI, Supabase direct queries when online, `LocalRepository` cache + `SyncService` mutation queue when offline, `BehaviorSubject` state. Single migration file with both tables, RLS policies, RPC functions, category-seed trigger. Feature module at `features/financial/` with page-container + presentational-component split, lazy-loaded routes.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Migration count | Single file for both tables + RPCs + triggers | Two separate migrations | Both tables are a single logical delta for phase 1; avoids FK ordering issues |
| Self-referential hierarchy validation | DB trigger `check_category_depth` + service validation | App-only validation | Defense in depth — trigger prevents direct Supabase writes bypassing 2-level rule |
| System category seeding | `INSERT ON CONFLICT DO NOTHING` per category | Trigger function with bulk insert loop | Idempotent, trivial to maintain, no procedural loop overhead for ~10 categories |
| System delete guard | Service-level reject + RLS block via `is_system` check | Trigger-only | Service gives UX feedback; RLS blocks malicious/buggy callers |
| Balance tracking | `initial_balance` + `current_balance` stored as `numeric(15,2)` | Computed column from transactions | Phase 1 has no transactions yet — stored denormalized fields let Phase 2 update balances from transaction insert triggers |

## Data Flow

```
Online:
  UI → Service.fetchByCondominium() → Supabase .select().is('deleted_at', null)
       → forEach → LocalRepository.upsert('account'|'transaction_category', ...)
       → BehaviorSubject.next(data) → async pipe → Component

Offline:
  UI → Service.create(data) → UUID v4 → LocalRepository.upsert({...data, _local_status: 'pending'})
       → SyncService.enqueueMutation('create', 'account'|'transaction_category', ...)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `supabase/migrations/20260701000000_financial_wallets_categories.sql` | Create | Both tables, indexes, RLS policies, RPC functions, category seed trigger |
| `src/app-types/condominium-accounts.ts` | Create | `CondominiumAccount` interface, `CreateCondominiumAccountData` type |
| `src/app-types/transaction-categories.ts` | Create | `TransactionCategory`, `CategoryTreeNode`, DTOs |
| `src/app-types/index.ts` | Modify | Add barrel exports for both new type files |
| `src/app/core/services/condominium-accounts/condominium-accounts.ts` | Create | Offline-first CRUD service mirroring `Structures` |
| `src/app/core/services/transaction-categories/transaction-categories.ts` | Create | CRUD + hierarchy validation, system protection |
| `src/app/core/services/sync/sync-service.ts` | Modify | Add `transaction_category` RPC mappings |
| `src/app/core/services/telemetry/telemetry.types.ts` | Modify | Add `FINANCIAL_WALLET_CREATED`, `FINANCIAL_CATEGORY_CREATED` to `TelemetryEvents` |
| `src/app/features/financial/pages/wallet-list/` | Create | `WalletListPage` — container: fetch, display, loading/empty/error states |
| `src/app/features/financial/components/wallet-card/` | Create | Presentational card: name, type icon, balance, currency |
| `src/app/features/financial/components/wallet-form-modal/` | Create | `ion-modal` form: name, type, currency, institution, icon, color |
| `src/app/features/financial/pages/category-list/` | Create | `CategoryListPage` — container: tabs (income/expense), tree rendering |
| `src/app/features/financial/components/category-group/` | Create | Root + children group display |
| `src/app/features/financial/components/category-card/` | Create | Single category: icon, name, badge, lock indicator |
| `src/app/features/financial/components/category-form-modal/` | Create | Form: name, type, icon, color, parent selector (roots only) |
| `src/app/app.routes.ts` | Modify | Add `financial` lazy-loaded routes under `isNotAuthenticatedGuard` |
| `src/assets/i18n/es.json` | Modify | Add `financial.wallets.*`, `financial.categories.*`, system category translations |
| `src/assets/i18n/en.json` | Modify | Same keys, English translations |

## Interfaces / Contracts

```typescript
// src/app-types/condominium-accounts.ts
export interface CondominiumAccount {
  id: string; name: string; condominium_id: string;
  account_type: 'bank' | 'cash' | 'wallet' | 'credit' | 'investment';
  currency: string; institution_name: string | null;
  initial_balance: number; current_balance: number;
  icon: string | null; color: string | null;
  created_at: string; updated_at: string; deleted_at: string | null;
}

// src/app-types/transaction-categories.ts
export interface TransactionCategory {
  id: string; condominium_id: string; parent_id: string | null;
  name: string; category_type: 'income' | 'expense';
  icon: string | null; color: string | null;
  is_system: boolean; i18n_key: string | null;
  created_at: string; updated_at: string; deleted_at: string | null;
}
export interface CategoryTreeNode extends TransactionCategory { children: TransactionCategory[]; }
```

Service API mirrors `Structures`: `fetchByCondominium(id)`, `getById(id)`, `create(data)`, `update(id, data)`, `delete(id)`. `TransactionCategories` adds `fetchByType(id, type)`, `fetchChildren(parentId)`.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit — Services | Online/offline fetch, create, update, delete paths | Mock `Supabase.client`, `NetworkStatusService.isOnline()`, `LocalRepository`, `SyncService`. Verify BehaviorSubject emissions, error propagation, cache writes |
| Unit — Services | Hierarchy validation (3rd level reject, system delete reject) | Direct `create()` / `delete()` calls expect thrown errors |
| Unit — Components | Loading, empty, populated, error states | `TestBed.configureTestingModule` with mock service, Transloco testing module |
| Unit — Components | Form validation (empty name, invalid account type) | Submit with invalid data, verify no emit |

## Migration / Rollout

Single migration is additive — no existing tables altered. Rollback: `DROP TABLE transaction_categories; DROP TABLE condominium_accounts; DROP FUNCTION soft_delete_account; DROP FUNCTION soft_delete_category; DROP TRIGGER seed_system_categories;` then remove feature code. No data migration needed.

## Open Questions

- [ ] Should `current_balance` be a generated column or denormalized field? Spec says denormalized for now — revisit in Phase 2 when transactions exist.
