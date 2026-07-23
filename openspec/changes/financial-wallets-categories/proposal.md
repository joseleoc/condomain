# Proposal: Financial Wallets & Categories (Phase 1 MVP)

## Intent

Enable condominium administrators to set up the financial foundation of their condo by creating **wallets** (where money lives) and **categories** (how money is classified). This is the first step of a hybrid model: simple TimelyBills-like UX on top, formal double-entry accounting engine underneath (Phase 3+).

Without wallets and categories, no financial transaction can be recorded. This phase unblocks all subsequent financial features.

## Scope

### In Scope
- Database migrations for `condominium_accounts` and `transaction_categories` tables
- TypeScript interfaces (`CondominiumAccount`, `TransactionCategory`) in `src/app-types/`
- `CondominiumAccountsService` — CRUD with soft delete (`deleted_at`), offline-first via `LocalRepository` + `SyncService`
- `TransactionCategoriesService` — CRUD with 2-level hierarchy enforcement, system category seeding
- Wallet management UI (list, create, edit, soft-delete) following TimelyBills patterns
- Category management UI (list, create, edit, delete) with icon/color picker and parent-child grouping
- System-defined category seeding on condominium creation (non-deletable, ES/EN translations)
- 2 telemetry events: `financial_wallet_created`, `financial_category_created`
- RLS policies for both tables (condominium-scoped access)
- Unit tests for services (80%+ coverage) and components (70%+)

### Out of Scope
- Financial transactions (Phase 2)
- Double-entry accounting engine and chart of accounts (Phase 3)
- Transaction approval workflow (Phase 4)
- Monthly balance snapshots and reports (Phase 5)
- Multi-currency exchange rate capture (Phase 6)
- Budget tracking, payment gateways, fiscal reports

## Capabilities

> Contract between proposal and specs phases. `openspec/specs/` is currently empty — all capabilities are new.

### New Capabilities
- `condominium-accounts`: Wallet CRUD, soft delete, type/currency validation, balance tracking, offline-first sync
- `transaction-categories`: Category CRUD, 2-level hierarchy (parent→children), icon/color, system-defined seeding, i18n (ES/EN for system, ES-only for user)

### Modified Capabilities
None — `openspec/specs/` has no existing specs.

## Approach

Follow existing codebase patterns:
- **Services**: `@Injectable({ providedIn: 'root' })`, `inject()` function, BehaviorSubjects for state, offline-first with `LocalRepository` + `SyncService`
- **Types**: Interfaces in `src/app-types/condominium-accounts.ts` and `src/app-types/transaction-categories.ts`, barrel export via `index.ts`
- **Feature**: `src/app/features/financial/` with container-presentational split
- **i18n**: Transloco keys in `src/assets/i18n/{en,es}.json` for system categories and UI strings
- **Telemetry**: Add 2 events to `TelemetryEvents` constant in `telemetry.types.ts`
- **Database**: Supabase migrations in `supabase/migrations/` with RLS policies
- **Testing**: TDD — spec files before implementation, Jasmine + Karma

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | 2 migration files (condominium_accounts, transaction_categories + RLS) |
| `src/app-types/` | New | 2 type files + barrel export update |
| `src/app/core/services/` | New | `condominium-accounts/` and `transaction-categories/` service directories |
| `src/app/features/financial/` | New | Feature module with wallet and category management pages/components |
| `src/assets/i18n/{en,es}.json` | Modified | System category translations + UI strings |
| `src/app/core/services/telemetry/telemetry.types.ts` | Modified | 2 new telemetry events |
| `src/app/app.routes.ts` | Modified | Lazy-loaded routes for financial feature |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| System category seeding fails on condo creation | Low | DB trigger with idempotent INSERT...ON CONFLICT DO NOTHING |
| Soft-deleted wallet data leaks in queries | Med | Partial index `WHERE deleted_at IS NULL` + service-level filter enforcement + RLS |
| 2-level hierarchy violated by direct DB writes | Low | CHECK constraint in DB + service validation |
| Offline mutations conflict on sync | Med | Existing `SyncOrchestrator` conflict resolution handles this |

## Rollback Plan

1. Drop migrations: `DROP TABLE IF EXISTS transaction_categories; DROP TABLE IF EXISTS condominium_accounts;`
2. Remove feature module and routes — no existing code depends on financial features
3. Remove telemetry events — no downstream consumers yet
4. Revert i18n keys — additive only, no breakage

## Dependencies

- Existing `SyncService` / `LocalRepository` / `SyncOrchestrator` for offline-first pattern
- Existing `TelemetryService` for event tracking
- Existing `ContextService` for active `condominium_id`
- `currencies` table (already exists) for FK reference

## Success Criteria

- [ ] Administrator can create, edit, and soft-delete wallets with type/currency/institution
- [ ] System categories auto-seeded on condominium creation with ES/EN translations
- [ ] Administrator can create parent categories and child categories (max 2 levels)
- [ ] System categories cannot be deleted from UI
- [ ] All wallet/category queries scoped to active condominium (RLS + service-level)
- [ ] Telemetry fires `financial_wallet_created` and `financial_category_created` events
- [ ] Services have 80%+ unit test coverage, components 70%+
- [ ] Offline mutations queue and sync correctly via existing sync infrastructure
