# Design: PostHog Product Telemetry

## Technical Approach

Pluggable telemetry via Adapter pattern matching the existing Angular service conventions. `TelemetryService` (singleton, `providedIn: 'root'`) is the injectable public API consumers use. It delegates to a `TelemetryProvider` interface injected via `InjectionToken`, making the backend swappable without touching consumer code. `PosthogProvider` is the concrete implementation wrapping `posthog-js`. Initialization gates on `environment.production && environment.posthogApiKey`.

## Architecture Decisions

| Decision | Choice | Tradeoff | Rationale |
|---|---|---|---|
| Provider polymorphism | `InjectionToken<TelemetryProvider>` | Slightly more setup than abstract class | Enables plain-object mocks, no inheritance coupling, idiomatic Angular DI |
| Init strategy | `TelemetryService` constructor | Must handle cold start (no key → silent no-op) | Follows `Supabase` service pattern; telemetry failure must not block app |
| Page view tracking | Internal `Router.events` subscription in `TelemetryService` | Service depends on Router | Single subscriber, zero page-component changes, self-contained |
| Typed events | `const` object with `as const` | No runtime code (unlike enum) | Literal type inference for autocomplete; strict-mode compatible |
| Provider registration | Factory in `main.ts` providers via `provideTelemetry()` | Adds one line to bootstrap | Transparent DI registration; `PosthogProvider` receives env keys at construction |

## Data Flow

```
bootstrapApplication()          Auth.signIn()           Any component
       │                             │                       │
       ▼                             ▼                       ▼
  provideTelemetry()         telemetryService            telemetryService
       │                     .identify(user,trait)       .track(event,props)
       ▼                             │                       │
  new PosthogProvider                ▼                       ▼
  (key, host)              ─── TelemetryService ────
       │                    │   gated: env.prod?     │
       ▼                    │                        │
  TELEMETRY_PROVIDER ───────┘                        │
  (InjectionToken)                                   │
       │                                             │
       ▼                                             ▼
  PosthogProvider                   ┌───────── provider.track()
  .init() ──► posthog.init()       │          provider.identify()
  .setSessionRecording()           │          provider.reset()
  .setHeatmaps()                   │
       │                           │
       ▼                           ▼
  Router.events ──► NavigationEnd ──► provider.track('$pageview', ...)
  (auto in constructor)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `package.json` | Modify | Add `posthog-js` |
| `src/environments/environment.ts` | Modify | Add `posthogApiKey: ''`, `posthogHost: ''` |
| `src/environments/environment.prod.ts` | Modify | Add production PostHog keys |
| `src/app/core/services/telemetry/telemetry.types.ts` | **Create** | `TelemetryProvider` interface, `TelemetryEvent`, `UserTraits`, `PageViewProperties` |
| `src/app/core/services/telemetry/telemetry-provider.token.ts` | **Create** | `TELEMETRY_PROVIDER` InjectionToken |
| `src/app/core/services/telemetry/telemetry.service.ts` | **Create** | `TelemetryService` singleton — public API + router subscription |
| `src/app/core/services/telemetry/telemetry.service.spec.ts` | **Create** | Unit tests with mock provider |
| `src/app/core/services/telemetry/providers/posthog.provider.ts` | **Create** | `PosthogProvider` implementing `TelemetryProvider` |
| `src/app/core/services/telemetry/providers/posthog.provider.spec.ts` | **Create** | Provider unit tests |
| `src/main.ts` | Modify | Add `provideTelemetry()` factory to providers array |
| `src/app/core/services/auth/auth.ts` | Modify | Inject `TelemetryService`, call `identify()` on sign-in/sign-up, `reset()` on sign-out |
| `src/app/core/services/auth/auth.spec.ts` | Modify | Add `TelemetryService` mock |
| `src/app/app.component.spec.ts` | Modify | Provide mock `TELEMETRY_PROVIDER` for tests |

## Interfaces / Contracts

```typescript
// telemetry.types.ts
export interface TelemetryProvider {
  init(apiKey: string, host: string): void;
  track(event: TelemetryEvent, properties: Record<string, unknown>): void;
  identify(userId: string, traits: UserTraits): void;
  reset(): void;
  setSessionRecording(enabled: boolean): void;
  setHeatmaps(enabled: boolean): void;
}

export const TelemetryEvents = {
  PAGE_VIEW: '$pageview',
  SIGN_UP: 'auth_sign_up_completed',
  SIGN_IN: 'auth_sign_in_completed',
  SIGN_OUT: 'auth_sign_out',
  WIZARD_STEP_COMPLETED: 'wizard_step_completed',
  WIZARD_CREATION_COMPLETED: 'wizard_creation_completed',
  PROPERTY_SELECTED: 'property_selected',
  CONDOMINIUM_SELECTED: 'condominium_selected',
} as const;

export type TelemetryEvent = (typeof TelemetryEvents)[keyof typeof TelemetryEvents];

export interface UserTraits {
  email: string;
  role: string; // per-condominium role
}

export interface PageViewProperties {
  path: string;
  title: string;
}
```

```typescript
// telemetry-provider.token.ts
export const TELEMETRY_PROVIDER = new InjectionToken<TelemetryProvider>(
  'TELEMETRY_PROVIDER',
);
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| `TelemetryService` | Gating (dev no-ops, prod delegates), router→pageview, delegate passthrough | Mock `TELEMETRY_PROVIDER`, provide in `TestBed` |
| `PosthogProvider` | `init()` calls `posthog.init()` with correct config, `track()`→`posthog.capture()`, recording/heatmap toggles | Mock `posthog-js` module |
| Auth integration | `identify()` called after sign-in, `reset()` called after sign-out | Mock `TelemetryService`, verify calls in auth spec |
| Integration | Provider swap yields no consumer changes | Separate test suite: inject mock→verify passthrough unchanged |

## Migration / Rollout

No migration required. Feature is additive. Rollback: revert the 13 file modifications (all new files + 5 modified files).

## Open Questions

- [ ] Production PostHog API key and host — need values from PostHog project settings before deployment
- [ ] Session recording sample rate — 5% recommended start, TBD with product
- [ ] Opt-out UI requirement — spec covers reset(); explicit opt-out toggle deferred
