# Condomain — AI Agent Guide

## Project Overview

Mobile-first web app for condominium management. Angular 20 + Ionic 8 + Capacitor 8, backed by Supabase (local Postgres 17). Multi-condominium membership with per-condominium roles, property/structure tracking, and double-entry financial accounting with multi-currency support.

## Developer Commands

```bash
pnpm install              # install dependencies
pnpm start                # dev server at http://localhost:8100
pnpm build                # production build → www/
pnpm test                 # Karma + Jasmine (browser, watch mode)
pnpm test:ci              # headless Chrome, single run
pnpm lint                 # ESLint (TS + HTML templates)
supabase start            # local Supabase (Postgres on :54321, Auth, Storage)
supabase db push          # apply migrations to linked DB
supabase migration new <name>  # create new migration
```

**Required order for verification**: `pnpm lint` → `pnpm build` → `pnpm test:ci`. The build must succeed before tests (Angular AOT compilation catches template errors that `ng test` alone may not).

## Tech Stack (non-obvious parts)

| Layer | Detail |
|---|---|
| State | RxJS BehaviorSubjects (services) + Angular Signals (component-local) |
| Server state | TanStack Query (`@tanstack/angular-query-experimental`) with IndexedDB persistence via `initQueryPersistence()` in `main.ts` |
| Telemetry | PostHog (`posthog-js`) — configured per environment |
| Charts | Chart.js + ng2-charts |
| i18n | `@jsverse/transloco` (NOT `@ngneat/transloco`). Default lang: `es`. Files: `src/assets/i18n/{en,es}.json` |
| Mobile | Capacitor 8 — `webDir: 'www'`, build output goes to `www/` |
| Bootstrap | `bootstrapApplication()` in `src/main.ts` — standalone, no NgModules |

## Architecture

### Route Structure (critical — not obvious from filenames)

All authenticated routes are nested under `/app` with `MainLayoutComponent`:

```
/                          → redirect → /app/home
/auth/*                    → sign-in, sign-up, forgot-password, update-password (redirects to /app/home if logged in)
/app/home                  → dashboard (requires auth + has condominiums)
/app/condominium/*         → condominium-hub, join-requests
/app/financial/*           → dashboard, wallets, transactions
/onboarding                → welcome page
/onboarding/create-condominium → wizard (3 steps: info → structures → properties)
/onboarding/join-condominium   → join via invitation code
```

Guards: `isAuthenticatedGuard` (redirects if already logged in), `isNotAuthenticatedGuard` (requires auth), `hasCondominiumsGuard` (redirects to onboarding if user has no condominiums), `captureInvitationCodeGuard` (captures invitation code from URL).

### Directory Boundaries

```
src/app/
├── core/           # Singleton services (33 domains), guards, directives, validators, providers
├── features/       # Lazy-loaded pages: auth, condominium, create-condominium, financial, home, onboarding
├── shared/         # Reusable UI components (layout, etc.)
src/app-types/      # Shared interfaces + barrel index.ts — import via @app-types/*
src/testing/        # Shared testing module (@testing/*)
src/environments/   # environment.ts (dev) / environment.prod.ts — swapped at build time
supabase/migrations/  # Timestamped SQL migrations — source of truth for DB schema
```

### Path Aliases (tsconfig.json)

`@core/*`, `@directives/*`, `@guards/*`, `@services/*`, `@shared/*`, `@features/*`, `@assets/*`, `@app-types/*`, `@testing/*`

### Key Patterns

- **DI**: `inject()` function only — never constructor injection.
- **Guards**: Functional (`CanActivateFn`), never class-based.
- **Services**: `@Injectable({ providedIn: 'root' })` singletons with BehaviorSubjects + `asObservable()`.
- **Components**: Standalone. Page components (`.page.ts`) orchestrate data; child components (`.component.ts`) handle UI.
- **Component selector prefix**: `app-` (enforced by ESLint). Suffixes: `Page` or `Component`.
- **Lazy loading**: All feature routes use `loadComponent()`.
- **Forms**: Reactive forms with standalone form components using `ControlContainer` for parent binding.

## Code Style

- **Strict TypeScript**: no `any` (use `unknown` + type guards), explicit return types, `noPropertyAccessFromIndexSignature`.
- **Observables**: suffix with `$` (e.g., `session$`). **Signals**: no suffix.
- **Files**: `kebab-case`. Feature components: `feature-name.component.ts`, pages: `feature-name.page.ts`.
- **SCSS**: Use Ionic CSS custom properties and `theme/variables.scss`. Primary color: `#ff8200`. No raw color values in components.
- **i18n**: All user-facing strings via Transloco — never hardcoded. Both `en` and `es` keys must stay in sync.

## Domain Rules (Critical)

### Double-Entry Accounting
- Every transaction affects **at least two accounts** — one Debit, one Credit. No single-account movements.
- **Never DELETE or UPDATE processed/historical transactions.** Use reversal transactions (Credit Note / Debit Note) to correct errors.
- Terminal states (`Processed`, `Cancelled`) are **immutable**.

### Multi-Currency
- Every transaction stores: original currency amount + exchange rate at time of transaction + equivalent in base currency.
- Exchange rates are stored at recording time — not recalculated later.

### Multi-Condominium Membership
- Users belong to multiple condominiums with a **specific role per condominium** (via `condominium_roles` join table).
- **Administrator**: full CRUD. **Owner**: read-only access to their own property information only.
- Roles are scoped per condominium — never inferred globally.

### Property-Structure Relationship
- Condominium → Structures (buildings/towers) → Properties (apartments/offices/parking).
- A property **always** belongs to a structure — cannot exist standalone.

## Supabase Workflow

- **Local-first**: `supabase start` runs Postgres on `:54321`, Auth, Storage. Dev environment points to `http://127.0.0.1:54321`.
- Migrations in `supabase/migrations/` with timestamp prefixes. `supabase/seed.sql` for seed data.
- Deploy: `supabase db push` after linking to production.
- Detailed workflow: `docs/supabase.md`.

## Commits (Conventional Commits — Strict)

```
<type>(<scope>): <description>
```

- Scope is **mandatory** (e.g., `auth`, `condominium`, `financial`, `wizard`, `accounting`, `db`, `config`).
- Imperative present tense, lowercase, no period.
- **No `Co-Authored-By` or AI attribution lines.**
