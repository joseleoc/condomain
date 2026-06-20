# Proposal: PostHog Product Telemetry

## Intent

Integrate PostHog analytics into Condomain for event-based product telemetry, session recording, and heatmaps. Currently the app has zero visibility into how users interact with features — no page views, no funnel analysis, no usage data. This change enables product-led decision-making while respecting user privacy.

## Scope

### In Scope
- Install `posthog-js` (not lite — need session recording & heatmaps)
- Create `PosthogService` singleton in `@core/services/posthog/` with typed event methods
- Initialize PostHog in `main.ts` providers (or via service constructor matching existing `Supabase` pattern)
- Track page views via Angular Router `NavigationEnd` events
- Track auth events: sign-up, sign-in, sign-out
- Track condominium wizard steps and creation completion
- Track property/condominium CRUD interactions (create, select)
- Enable heatmaps and session recording
- Environment-gated: disabled in dev, enabled in prod
- Privacy safeguards: `maskPersonalData`, no PII in event payloads

### Out of Scope
- Feature-flag evaluation via PostHog (future concern)
- A/B testing or experiment framework
- Reverse-proxying PostHog requests through own domain
- Self-hosting PostHog infrastructure
- Migration of historical data or event backfill

## Capabilities

### New Capabilities
- `product-telemetry`: Event-based analytics tracking with PostHog, including page views, user actions, session recording, and heatmaps

### Modified Capabilities
None — this is a new integration.

## Approach

Direct `posthog-js` integration via a `PosthogService` singleton (matching existing `Supabase` service pattern). The service initializes PostHog in its constructor, gates on `environment.production`, and exposes typed methods (`capture()`, `identify()`, `reset()`, `enableRecording()`, `disableRecording()`). `AppComponent` subscribes to `Router.events` for automatic page views. Individual features call `PosthogService.capture()` for domain events. All event names and properties use typed constants/enums.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Add `posthog-js` dependency |
| `src/environments/environment.ts` | Modified | Add `posthogApiKey`, `posthogHost` |
| `src/environments/environment.prod.ts` | Modified | Add production PostHog credentials |
| `src/app/core/services/posthog/posthog.ts` | **New** | PosthogService singleton |
| `src/app/core/services/posthog/posthog.spec.ts` | **New** | Unit tests for PosthogService |
| `src/app/app.component.ts` | Modified | Inject PosthogService, track page views |
| `src/app/app.component.spec.ts` | Modified | Add PosthogService mock |
| `src/app/core/services/auth/auth.ts` | Modified | Track auth events via PosthogService |
| `src/main.ts` | Modified | Optional: provide PosthogService if needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Bundle size increase (~40KB) | High | Monitor via `ng build --stats-json`; posthog-js is lazy-loaded via service init |
| Dev events pollute production data | Medium | Gate on `environment.production`; dev keys should be separate if enabled |
| Session recording quota/cost | Medium | Start with 5% sample rate; monitor PostHog billing dashboard |
| GDPR compliance gaps | Low | Configure `maskPersonalData`, `opt_out_capturing_by_default`, provide opt-out UI |

## Rollback Plan

1. Remove `posthog-js` from `package.json` and run `pnpm install`
2. Delete `PosthogService` and its test file
3. Revert `AppComponent`, `Auth`, and `main.ts` changes
4. Revert environment files
5. PR revert is < 50 lines — single atomic revert commit

## Dependencies

- `posthog-js` (npm package) — latest stable version
- Supabase project or env var for PostHog API key in CI/CD

## Success Criteria

- [ ] PostHog dashboard shows page views after navigating through auth → home → condominium flows
- [ ] Session recordings appear in PostHog after user interactions
- [ ] Heatmaps render on key pages
- [ ] Auth events (sign-up, sign-in, sign-out) appear in PostHog event explorer
- [ ] Wizard step completions tracked for create-condominium flow
- [ ] PosthogService unit tests pass (mock PostHog, verify typed methods)
- [ ] Dev environment shows no PostHog network requests
