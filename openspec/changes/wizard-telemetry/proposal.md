# Proposal: Wizard Telemetry

## Intent

Instrument the create-condominium wizard with comprehensive analytics to understand user behavior — which creation modes are used, where users drop off, how long steps take, and which CRUD operations happen most. Currently `WIZARD_STEP_COMPLETED` and `WIZARD_CREATION_COMPLETED` events exist but are never emitted.

## Scope

### In Scope
- 3 new Level 1 events: `wizard_started`, `wizard_abandoned`, `wizard_restored`
- 2 new Level 2 events: `wizard_mode_selected`, `wizard_error`
- 6 new Level 3 events: `structure_added`, `structure_edited`, `structure_deleted`, `property_added`, `property_edited`, `property_deleted`, `property_generation_completed`, `structure_generation_completed`
- Time-per-step tracking via Wizard service timestamps
- TelemetryService injected into Wizard service + 7 component-level injections
- Tests for all new telemetry calls

### Out of Scope
- Dashboard / analytics UI to view events
- Backend event ingestion or storage
- Session recording or heatmap changes
- AI creation mode implementation (still a stub)

## Capabilities

### New Capabilities
- `wizard-telemetry`: Telemetry instrumentation across the create-condominium wizard flow

### Modified Capabilities
None

## Approach

Inject `TelemetryService` into Wizard service (same pattern as Auth service). Track timestamps on `setStep()` calls to compute duration per step. Add event constants for all 3 levels. Inject TelemetryService into each component that needs granular CRUD tracking. Wrap all calls in try/catch — errors in telemetry MUST NOT break the wizard.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `telemetry.types.ts` | Modified | Add 7 new event constants |
| `wizard.ts` | Modified | Inject TelemetryService, add timestamp tracking + 5 event calls |
| `create-condominium.page.ts` | Modified | Track wizard_started (constructor), wizard_abandoned (OnDestroy) |
| `creation-process-selector.component.ts` | Modified | Track wizard_mode_selected on submit |
| `step-2.component.ts` | Modified | Track wizard_error on validation failure |
| `simple-creation-process.component.ts` | Modified | Track structure_added, structure_edited |
| `massive-creation-process.component.ts` | Modified | Track structure_generation_completed |
| `massive-property-creation.component.ts` | Modified | Track property_generation_completed |
| `step-3.component.ts` | Modified | Track property_added, property_edited |
| `structures-list.component.ts` | Modified | Track structure_deleted |
| `structures-properties-accordion.component.ts` | Modified | Track property_deleted |
| `.spec.ts` files (12) | Modified | Tests for new telemetry calls |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Broken wizard from telemetry errors | Low | try/catch on every track() call; track() already no-ops when disabled |
| NoOpProvider timing in tests | Low | Mock TelemetryService in component specs with jasmine.createSpyObj |
| AI mode stub events | Low | Still track mode_selected=ai — data tells us if users hit it |

## Rollback Plan

Revert all changes in a single commit. No data migration needed — telemetry events are fire-and-forget. Reverted files: `telemetry.types.ts`, `wizard.ts`, and all component `.ts` files.

## Dependencies

None — telemetry infrastructure is already deployed and operational.

## Success Criteria

- [ ] All 11 new events fire with correct properties (step, mode, counts) when corresponding user actions occur
- [ ] Step duration captured as `time_spent_ms` on `wizard_step_completed` events
- [ ] Zero regression in wizard functionality — all existing tests pass
- [ ] Telemetry errors never surface to user or break wizard flow
