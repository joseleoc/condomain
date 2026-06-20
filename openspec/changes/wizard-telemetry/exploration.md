## Exploration: Wizard Telemetry

### Current State

Telemetry infrastructure fully operational: `TelemetryService` (singleton, `providedIn: 'root'`) wraps PostHog in production or `NoOpProvider` in dev, gated by `TELEMETRY_ENABLED` DI token. `track()` is already safe to call — no-ops when disabled.

`TelemetryEvents` defines `WIZARD_STEP_COMPLETED` and `WIZARD_CREATION_COMPLETED` but they are **never called anywhere**. The [Auth service](cci:1://file:///home/joseleoc/Documents/personal/condomain/src/app/core/services/auth/auth.ts:22:22) demonstrates the injection pattern: `private telemetry = inject(TelemetryService)`.

The `Wizard` service manages all step transitions, local structure/property CRUD, and final submission. Components delegate to Wizard for data mutations. Telemetry injection would follow the Auth service pattern exactly.

### Affected Areas

- `src/app/core/services/telemetry/telemetry.types.ts` — Add 7 new event constants (Level 2 + Level 3)
- `src/app/features/create-condominium/services/wizard/wizard.ts` — Inject TelemetryService, track step completions with duration, track `wizard_creation_completed` with structures/properties count, track `wizard_restored`, time-tracking with timestamps
- `src/app/features/create-condominium/create-condominium.page.ts` — Track `wizard_started` on init, `wizard_abandoned` on destroy/navigation away
- `src/app/features/create-condominium/components/creation-process-selector/creation-process-selector.component.ts` — Track `wizard_mode_selected` when user picks Simple/Massive/AI
- `src/app/features/create-condominium/components/step-2/step-2.component.ts` — Track validation errors in `wizard_error`
- `src/app/features/create-condominium/components/simple-creation-process/simple-creation-process.component.ts` — Track `structure_added`, `structure_edited` via add/edit structure
- `src/app/features/create-condominium/components/massive-creation-process/massive-creation-process.component.ts` — Track `structure_generation_completed` and `structure_added` for massive pattern
- `src/app/features/create-condominium/components/massive-property-creation/massive-property-creation.component.ts` — Track `property_generation_completed` for massive pattern
- `src/app/features/create-condominium/components/step-3/step-3.component.ts` — Track `property_added`, `property_edited` via add/edit property
- `src/app/features/create-condominium/components/structures-list/structures-list.component.ts` — Track `structure_deleted`
- `src/app/features/create-condominium/components/structures-properties-accordion/structures-properties-accordion.component.ts` — Track `property_deleted`
- All corresponding `.spec.ts` files — Add tests for new telemetry calls

### Approaches

1. **Minimal — Wizard service only** — Add all events only in Wizard service via setStep() and createStructuresAndProperties()
   - Pros: Single injection point, minimal changes
   - Cons: Misses granular events (mode selection, individual CRUD), loses component-level context
   - Effort: Low

2. **Full instrumentation — Wizard + all components** — Inject TelemetryService at every level where user action happens
   - Pros: Complete event coverage per spec, rich context per event (mode, count, step)
   - Cons: More files changed, more DI injects
   - Effort: Medium

3. **Shared event bus approach** — Wizard emits events as Observables, components consume and forward to telemetry
   - Pros: Decoupled, testable
   - Cons: Over-engineered for 11 new events, adds indirection without benefit
   - Effort: High

### Recommendation

**Approach 2 — Full instrumentation**. The user specifically defined 3 levels of events with explicit component mappings. The cost is low (each component gets 1-3 `this.telemetry.track()` calls, wrapped in try/catch). Total changed lines forecast: ~250-350 across ~12 files. Fits well within the 400-line budget for a single PR.

### Risks
- **Non-blocking safety**: Telemetry calls must never break wizard flow. `TelemetryService.track()` already gates on `isEnabled`, but callers should still wrap in try/catch — the existing NoOpProvider already swallows calls silently.
- **AI mode is a stub**: If someone selects AI mode, events for mode_selected will fire but AI mode has no implementation. This is fine — we flag it in events.
- **Time tracking accuracy**: Using `Date.now()` timestamps in Wizard's `setStep()` is sufficient. `performance.now()` is overkill for step transitions measured in minutes.

### Ready for Proposal
Yes
