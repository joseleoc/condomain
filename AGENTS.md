# Condomain — AI Agent Guide

## Project Overview

Mobile-first web app for condominium management. Built with Angular 20 + Ionic 8 + Capacitor 8, backed by Supabase. Manages multi-condominium membership with role-based access, property/structure tracking, and double-entry financial accounting.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 20 (standalone components, no NgModules) |
| UI | Ionic 8, SCSS, ionicons |
| Mobile | Capacitor 8 |
| State | RxJS BehaviorSubjects + Angular Signals |
| Backend | Supabase (Postgres 17, Auth, Storage, Realtime) |
| i18n | Transloco (EN / ES) |
| Testing | Jasmine 6 + Karma 6 |
| Build | Angular CLI (application builder) |
| Package Manager | pnpm |
| Linter | ESLint + @angular-eslint |

## Architecture & Conventions

### Directory Structure
```
src/
├── app/
│   ├── app.component.ts/html/scss
│   ├── app.routes.ts
│   ├── core/               # Singleton services, guards, directives, validators
│   │   ├── directives/
│   │   ├── guards/
│   │   ├── services/       # Data access & business logic services
│   │   └── validators/
│   ├── features/           # Lazy-loaded feature modules
│   │   ├── auth/
│   │   │   ├── pages/      # Page components (routed)
│   │   │   ├── components/ # Presentational components
│   │   │   ├── types/      # Feature-specific types
│   │   │   └── styles/     # Feature-specific styles
│   │   ├── home/
│   │   ├── condominium/
│   │   └── create-condominium/
│   │       ├── services/   # Feature-specific services (e.g., wizard)
│   │       └── components/ # Step components
│   └── shared/
│       └── components/     # Reusable UI components (layout, avatar, etc.)
├── app-types/               # Shared interfaces & barrel index
├── assets/                  # Fonts, i18n JSON, icons
├── environments/            # Dev & prod env config
└── theme/                   # Global SCSS (variables, fonts, general, text)
```

### Patterns
- **Standalone components only** — no NgModules. Bootstrap via `bootstrapApplication()`.
- **Feature-based** — each feature owns its pages, components, types, styles, services.
- **Container-Presentational** — pages orchestrate DI and data flow; child components handle UI.
- **Dependency injection** — use `inject()` function, never constructor injection.
- **Services** — `@Injectable({ providedIn: 'root' })` singletons. Business logic lives here.
- **Reactive state** — BehaviorSubjects + `asObservable()`. Signals for local component state.
- **Functional guards** — `CanActivateFn`, never class-based guards.
- **Reactive forms** — form components are standalone with `ControlContainer` for parent binding.
- **Lazy loading** — all feature routes use `loadComponent()`.
- **Path aliases** — `@core/*`, `@services/*`, `@shared/*`, `@features/*`, `@app-types/*`, `@assets/*`, `@directives/*`, `@guards/*`.

### Routing
| Path | Guard | Description |
|---|---|---|
| `/auth/*` | `isAuthenticatedGuard` | Redirects logged-in users to `/home` |
| `/home` | `isNotAuthenticatedGuard` | Dashboard (requires auth) |
| `/condominium/*` | `isNotAuthenticatedGuard` | Condominium features (requires auth) |
| `/create-condominium` | `isNotAuthenticatedGuard` | Wizard (requires auth) |
| `/` | — | Redirects to `/home` |

## Code Style Rules

### TypeScript
- **Strict mode** enabled. No `any` — use `unknown` and narrow with type guards.
- Explicit return types on functions and methods. No implicit `any` inferred returns.
- Use Angular 20 features: `inject()`, `signal()`, `computed()`, `effect()`, `input()`, `output()`.
- Prefer `toSignal()` / `toObservable()` interop over manual subscription management.
- `async` pipe in templates instead of `.subscribe()` in components.
- No `ngOnInit` for DI — `inject()` at top of class or in factory function.
- Functional guards (`CanActivateFn`), never class guards.
- Private class members use `#` private fields (not TypeScript `private` keyword) where possible, or stick to `private` for Angular-internal usage.

### Naming
- **Files**: `kebab-case` for all files. Feature components: `feature-name.component.ts`.
- **Classes**: PascalCase. Services: `DataService`. Components: `SignInFormComponent`.
- **Functions/variables**: camelCase.
- **Observables**: suffix with `$` (e.g., `session$`, `isAuthenticated$`).
- **Signals**: no suffix (e.g., `step`, `loading`).
- **Routes**: `kebab-case` in paths, camelCase for route variable names.
- **Types/interfaces**: PascalCase, prefixed with `I` only when necessary for disambiguation.

### SCSS
- BEM-like naming within components.
- Use Ionic CSS custom properties (`--ion-color-*`) and theme variables from `theme/variables.scss`.
- Primary color: `#ff8200` (orange).
- Dark mode via `prefers-color-scheme: dark`.
- No raw color values in component styles — use theme variables.

### Imports
- Barrel exports for feature directories (`index.ts`).
- Absolute path aliases preferred over relative imports (`@core/*`, `@shared/*`, etc.).
- Order: Angular core → Angular features → Ionic → third-party → project aliases → relative.

### i18n
- All user-facing strings in Transloco JSON (`src/assets/i18n/{en,es}.json`).
- Default language: Spanish (ES). English translations must always match.
- Use Transloco pipes/directives in templates, not hardcoded strings.

## Domain Rules (Critical)

### Multi-Condominium Membership
- Users belong to multiple condominiums with a **specific role per condominium**.
- Role is assigned via `condominium_roles` join table — never inferred globally.

### Role-Based Access
- **Administrator**: full CRUD, manage structures/properties, generate notifications, billing notices, approve payments, register expenses.
- **Owner**: read-only access to **their own property information only**, not general condominium data.
- Roles are fixed and scoped per condominium.

### Double-Entry Accounting (Partida Doble)
- **Every financial transaction affects at least two accounts** — one Debit, one Credit.
- No single-account movements exist.
- Each transaction represents a resource flow from origin to destination.

### Immutability & Audit Trail
- **Never DELETE or UPDATE processed/historical transactions.**
- If a financial record (income/expense) is wrong, do NOT modify the original record.
- Use **reversal transactions** (Credit Note / Debit Note) to correct errors — this preserves the audit trail.
- Transaction states: `Pending` → `Processed` → `Cancelled` (or similar explicit state machine).
- Terminal states (`Processed`, `Cancelled`) are immutable — no alterations allowed.

### Multi-Currency Architecture
- Every transaction must capture the **original currency** (USD, VES, EUR, etc.).
- **Exchange rate at time of transaction** is mandatory — stored at the moment of recording.
- **Dual amount storage**: store both the original currency amount AND its equivalent in the system base currency.
- This enables consolidated financial statements that remain stable despite daily exchange rate fluctuations.

### Property-Structure Relationship
- A condominium has **structures** (buildings, towers, sections).
- Structures contain **properties** (apartments, offices, parking spots).
- A property always belongs to a structure — cannot exist standalone.
- Validation rules at service level enforce these relationships.

### Condominium Creation Wizard
- Multi-step wizard: Step 1 (basic info) → Step 2 (structures) → Step 3 (properties).
- Wizard state managed via `WizardService` (signals for step, BehaviorSubjects for data).
- Three creation modes: Simple, Massive, AI.

## Testing (Jasmine + Karma)

- **TDD approach**: write tests before implementation.
- Every service, guard, directive, pipe, and page component must have a `.spec.ts` file.
- Test file lives next to the implementation file.
- Use `TestBed.configureTestingModule` with standalone component imports.
- For services: test `BehaviorSubject` emissions, error states, loading states.
- For guards: test both `true` and `false`/redirect paths.
- For components: test rendering states (loading, empty, error, populated).
- Coverage target: 80%+ for services and guards, 70%+ for components.

## Commits (Conventional Commits — Strict)

Format:
```
<type>(<scope>): <description>

[optional body]
```

### Types
- `feat`: new feature
- `fix`: bug fix
- `refactor`: code change that neither fixes a bug nor adds a feature
- `test`: adding or fixing tests
- `docs`: documentation only
- `chore`: build, config, CI, dependencies
- `style`: formatting, linting (no production code change)
- `perf`: performance improvement
- `revert`: revert a previous commit

### Scopes (examples — use as appropriate)
- `auth` — authentication flow
- `condominium` — condominium CRUD
- `structures` — structure management
- `properties` — property management
- `wizard` — condominium creation wizard
- `accounting` — financial / double-entry
- `roles` — role-based access
- `i18n` — translations
- `mobile` — Capacitor / native features
- `db` — Supabase migrations
- `config` — build, tooling, dependencies

### Rules
- Scope is **mandatory**.
- Description: imperative present tense, lowercase, no period.
- Body: optional, use when the commit needs explanation.
- No `Co-Authored-By` or AI attribution lines.

## Workflow

### Interaction Model
1. For significant changes: I will **explain the approach first**, wait for approval, then implement.
2. For bugs or small changes: I may proceed directly if the fix is obvious and low-risk.
3. I will **push back** if asked to implement something without understanding the domain context.

### Before Implementing
- Read relevant existing code to match conventions.
- Check domain rules above — especially financial/accounting constraints.
- Verify against existing types and services rather than creating duplicates.

### Engram Memory (Automatic Documentation)
I will proactively save to persistent memory after:
- Architecture or design decisions
- Bug fixes (including root cause)
- Pattern or convention establishment
- Configuration changes
- Non-obvious discoveries or gotchas
- Any user preference or constraint learned

## Supabase Workflow

- Local-first: run `supabase start` for local Postgres + Auth + Storage.
- Migrations in `supabase/migrations/` with timestamp prefixes.
- Use `supabase migration new <name>` to create migrations.
- Seed data in `supabase/seed.sql`.
- Deploy: `supabase db push` after linking to production.
- For detailed workflow, see `docs/supabase.md`.

## Ignored / Out of Scope

- No Dockerfiles or CI config — Supabase handles infra locally.
- No E2E testing (no Cypress/Playwright/Protractor configured).
- No NgModule-based architecture — everything is standalone.
