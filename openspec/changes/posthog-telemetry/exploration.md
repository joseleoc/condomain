## Exploration: posthog-telemetry

### Current State
Condomain has zero analytics or telemetry. The app runs as a mobile-first Angular 20 + Ionic 8 SPA with Supabase backend. No page views, user actions, or product usage data is collected. No PostHog packages or analytics code exist in the codebase.

### Affected Areas
- `package.json` — add `posthog-js` dependency
- `src/environments/environment.ts` / `environment.prod.ts` — add PostHog API key & host
- `src/app/core/services/posthog/posthog.ts` — new PosthogService singleton
- `src/app/app.component.ts` — inject PosthogService, subscribe to Router events for page views
- `src/app/core/services/auth/auth.ts` — track sign-in, sign-up, sign-out events
- `src/main.ts` — optional: provide any PostHog-related config if needed (likely not needed, PosthogService self-initializes)

### Approaches
1. **Direct `posthog-js` integration** — Use the official PostHog JS library directly. Initialize in a singleton service constructor (same pattern as `Supabase` service). Provide typed event-tracking methods. Subscribe to Angular Router events for automatic page views.
   - Pros: Official library, full feature support (heatmaps, session recording, autocapture), simple DI pattern matching existing code, well-documented
   - Cons: Adds ~40KB to bundle, no Angular-specific wrapper (but not needed — posthog-js is framework-agnostic)
   - Effort: Low

2. **posthog-js-lite** — Smaller bundle alternative.
   - Pros: Lighter footprint (~5KB)
   - Cons: No session recording, no heatmaps, no autocapture — directly conflicts with user requirements for these features
   - Effort: Low

3. **Custom abstraction layer over posthog-js** — Wrap posthog-js in an abstract `AnalyticsProvider` interface with enums for event names, allowing swapping PostHog for another provider later.
   - Pros: Provider-agnostic, testable via interface mocking
   - Cons: Over-engineering for a single provider, adds indirection with no current benefit, contradicts "small change under 400 lines" constraint
   - Effort: Medium

### Recommendation
**Approach 1** — Direct `posthog-js` integration with typed event methods. It matches the existing codebase patterns (see `Supabase` service — same direct library initialization pattern), keeps the change under 400 lines, and delivers all requested features (heatmaps, session recording, event tracking). The typed methods provide enough safety without a full abstraction layer.

### Risks
- **Bundle size**: `posthog-js` adds ~40KB gzipped. Acceptable for product telemetry but should be noted.
- **GDPR/Privacy**: PostHog captures IP, user agent, and page URLs by default. Must configure `maskPersonalData` and `opt_out_capturing_by_default` for compliance.
- **Session recording storage cost**: PostHog session recordings can consume significant storage. Monitor quota.
- **Dev spam**: If not properly disabled in dev, local actions pollute production analytics. Must gate on `environment.production`.

### Ready for Proposal
Yes — requirements are well-defined, the approach is clear. Move to proposal phase.
