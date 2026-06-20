# Tasks: PostHog Product Telemetry

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~290 additions |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Foundation

- [x] 1.1 Install `posthog-js` — `pnpm add posthog-js`
- [x] 1.2 Create `src/app/core/services/telemetry/telemetry.types.ts` — `TelemetryProvider` interface, `TelemetryEvents` const, `UserTraits`, `PageViewProperties`
- [x] 1.3 Create `src/app/core/services/telemetry/telemetry-provider.token.ts` — `TELEMETRY_PROVIDER` InjectionToken
- [x] 1.4 Update `src/environments/environment.ts` — add `posthogApiKey: ''`, `posthogHost: ''`
- [x] 1.5 Update `src/environments/environment.prod.ts` — add `posthogApiKey`, `posthogHost` with placeholder values

## Phase 2: TelemetryService (Test-First)

- [x] 2.1 [RED] Write `src/app/core/services/telemetry/telemetry.service.spec.ts` — mock provider; test dev gating (no-ops), prod passthrough, Router NavigationEnd → `track('$pageview')`
- [x] 2.2 [GREEN] Create `src/app/core/services/telemetry/telemetry.service.ts` — `inject(TELEMETRY_PROVIDER)`, `inject(Router)`, gates on `TELEMETRY_ENABLED`, delegates `track/identify/reset`

## Phase 3: PosthogProvider (Test-First)

- [x] 3.1 [RED] Write `src/app/core/services/telemetry/providers/posthog.provider.spec.ts` — mock posthog-js; test `init()` calls `posthog.init()`, `track()` → `posthog.capture()`, `setSessionRecording`/`setHeatmaps` toggles
- [x] 3.2 [GREEN] Create `src/app/core/services/telemetry/providers/posthog.provider.ts` — `PosthogProvider` class implementing `TelemetryProvider`, wraps `posthog-js` methods

## Phase 4: Registration & Wiring

- [x] 4.1 Create `provideTelemetry()` factory in `src/app/core/services/telemetry/index.ts` — registers `PosthogProvider` as `TELEMETRY_PROVIDER`
- [x] 4.2 Update `src/main.ts` — add `provideTelemetry()` to `bootstrapApplication` providers array
- [x] 4.3 [RED] Update `src/app/core/services/auth/auth.spec.ts` — provide `TelemetryService` mock; verify `identify` called after sign-in, `reset` after sign-out
- [x] 4.4 [GREEN] Update `src/app/core/services/auth/auth.ts` — inject `TelemetryService`, call `identify(user.id, traits)` after `signInWithEmailAndPassword`/`signUpWithEmailAndPassword`, `reset()` after `signOut`
- [x] 4.5 [TEST] Update `src/app/app.component.spec.ts` — provide mock `TELEMETRY_ENABLED` to stabilize existing tests
