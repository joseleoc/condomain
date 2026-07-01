# Tasks: Financial Wallets & Categories (Phase 1 MVP)

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2000–2400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Services) → PR 3 (Wallets UI) → PR 4 (Categories UI) → PR 5 (i18n/Telemetry/Verify) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

### Suggested Work Units

| Unit | Goal | Likely PR |
|------|------|-----------|
| 1 | DB migration + types + SyncService mappings | PR 1; base = main |
| 2 | Both services (offline-first, hierarchy, system protection) | PR 2; base = main |
| 3 | Wallet UI (list, card, form modal, routes) | PR 3; base = main |
| 4 | Category UI (list, group, card, form modal, routes) | PR 4; base = main |
| 5 | i18n, telemetry, integration verification | PR 5; base = main |

## Phase 1: Foundation

- [x] 1.1 Create `supabase/migrations/20260701000000_financial_wallets_categories.sql` — both tables, partial unique indexes, RLS, RPCs (`soft_delete_account`, `soft_delete_category`), 2-level hierarchy trigger, system seed trigger on `condominiums` INSERT
- [x] 1.2 Add `src/app-types/condominium-accounts.ts` (`CondominiumAccount`, `CreateCondominiumAccountData`) and `transaction-categories.ts` (`TransactionCategory`, `CategoryTreeNode`, DTOs) + barrel export; write type-parity tests
- [x] 1.3 Add `account`/`transaction_category` RPC mappings to `SyncService.#buildRpcName()` and `#buildRpcParams()`; write mapping tests

## Phase 2: Core Services

- [x] 2.1 Create `CondominiumAccountsService` — offline-first CRUD (`fetchByCondominium`, `getById`, `create`, `update`, `delete`), BehaviorSubject state, Telemetry; test online/offline fetch, offline queue, update revert, soft-delete RPC
- [x] 2.2 Create `TransactionCategoriesService` — CRUD + hierarchy validation (3rd-level reject), system protection (delete/update reject), tree-building `fetchByType`, Telemetry; test tree, hierarchy reject, system lock, offline queue

## Phase 3: Wallet UI

- [x] 3.1 Create `WalletListPage` container — service BehaviorSubjects, loading/empty/populated/error states, swipe-to-delete with confirm; lazy route at `/financial/wallets`; component tests
- [x] 3.2 Create `WalletCard` presentational — name, type icon, balance + currency, institution; component tests
- [x] 3.3 Create `WalletFormModal` — reactive form (name, type, currency, institution, icon, color, initial balance), create/edit modes; test validation

## Phase 4: Category UI

- [ ] 4.1 Create `CategoryListPage` container — income/expense tabs, tree via `CategoryGroup`, system lock icons, create/edit/delete with protection; lazy route at `/financial/categories`; component tests
- [ ] 4.2 Create `CategoryGroup` — root + children grouped display; component tests
- [ ] 4.3 Create `CategoryCard` — icon, name, color, system lock badge; test system vs user display
- [ ] 4.4 Create `CategoryFormModal` — reactive form (name, type, parent roots-only selector, icon, color); test validation and parent filter

## Phase 5: i18n, Telemetry, Integration

- [ ] 5.1 Add `financial.wallets.*` and `financial.categories.*` (including system category translations) to `es.json` and `en.json`
- [ ] 5.2 Add `FINANCIAL_WALLET_CREATED` / `FINANCIAL_CATEGORY_CREATED` to `TelemetryEvents`; wire into both service `create()`; test events fire
- [ ] 5.3 Run full suite (services 80%+, components 70%+), verify offline behaviour, seed idempotency, manual E2E checklist
