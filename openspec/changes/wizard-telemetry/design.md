# Design: Wizard Telemetry

## Technical Approach

Inject `TelemetryService` into the Wizard service and 7 component files following the existing Auth service pattern. Add 8 new event constants to `TelemetryEvents`. Use `Date.now()` timestamps in Wizard `setStep()` for per-step duration. Wrap every `track()` call in try/catch. All events include step, creation mode, and action-specific context.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Time tracking mechanism | `Date.now()` in Wizard `setStep()` | Step transitions last seconds to minutes — sub-millisecond precision not needed. Simpler than `performance.now()` and avoids cross-boundary timing issues |
| Telemetry entry point | Direct injection into components | Follows established Auth service pattern. Avoids event bus indirection. Each component tracks its own action context |
| Error isolation | try/catch per `track()` call | `TelemetryService.track()` already no-ops when disabled, but explicit try/catch guarantees zero wizard breakage even if DI fails |
| Event naming | Snake_case strings | Matches existing `TelemetryEvents` convention and PostHog event naming standards |

## Data Flow

```
CreateCondominiumPage ──→ Wizard (inject TelemetryService)
    │ wizard_started          │ step_start_time: Date.now()
    │ wizard_abandoned        │
    │ wizard_restored         │ setStep() → track wizard_step_completed
    │                         │ uploadStructuresAndProperties() → track wizard_creation_completed
    │                         │
    ▼                         ▼
Step2Component          CreationProcessSelectorComponent
    │ wizard_error               │ wizard_mode_selected
    │                             │
    ▼                             ▼
SimpleCreationProcess    MassiveCreationProcess
    │ structure_added             │ structure_generation_completed
    │ structure_edited            │
    │                             │
    ▼                             ▼
StructuresListComponent  MassivePropertyCreation
    │ structure_deleted           │ property_generation_completed
    │                             │
    ▼                             ▼
Step3Component           StructuresPropertiesAccordion
    │ property_added              │ property_deleted
    │ property_edited             │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `telemetry.types.ts` | Modify | Add 8 new constants to `TelemetryEvents` |
| `wizard.ts` | Modify | Inject TelemetryService, add `stepStartTime`, track events in `setStep()`, `restoreFromStorage()`, `uploadStructuresAndProperties()` |
| `create-condominium.page.ts` | Modify | Track `wizard_started` in constructor, `wizard_abandoned` in OnDestroy |
| `creation-process-selector.component.ts` | Modify | Track `wizard_mode_selected` in `handleSubmit()` |
| `step-2.component.ts` | Modify | Track `wizard_error` on validation failure |
| `simple-creation-process.component.ts` | Modify | Track `structure_added`/`structure_edited` on save/success |
| `massive-creation-process.component.ts` | Modify | Track `structure_generation_completed` after pattern generation |
| `massive-property-creation.component.ts` | Modify | Track `property_generation_completed` after pattern generation |
| `step-3.component.ts` | Modify | Track `property_added`/`property_edited` on create/edit success |
| `structures-list.component.ts` | Modify | Track `structure_deleted` on confirm |
| `structures-properties-accordion.component.ts` | Modify | Track `property_deleted` on confirm |
| All corresponding `.spec.ts` | Modify | Add `jasmine.createSpyObj<TelemetryService>` mocks and `expect(...track).toHaveBeenCalledWith(...)` assertions |

## Interfaces / Contracts

```typescript
// New event constants in telemetry.types.ts
WIZARD_STARTED: 'wizard_started',
WIZARD_ABANDONED: 'wizard_abandoned',
WIZARD_RESTORED: 'wizard_restored',
WIZARD_MODE_SELECTED: 'wizard_mode_selected',
WIZARD_ERROR: 'wizard_error',
STRUCTURE_ADDED: 'structure_added',
STRUCTURE_EDITED: 'structure_edited',
STRUCTURE_DELETED: 'structure_deleted',
PROPERTY_ADDED: 'property_added',
PROPERTY_EDITED: 'property_edited',
PROPERTY_DELETED: 'property_deleted',
STRUCTURE_GENERATION_COMPLETED: 'structure_generation_completed',
PROPERTY_GENERATION_COMPLETED: 'property_generation_completed',

// Wizard timestamp tracking
private stepStartTime = Date.now();

// Subsequent events follow same pattern:
// this.telemetry.track(TelemetryEvents.EVENT_NAME, { ...context })
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Each component's telemetry track() call | Mock TelemetryService with `jasmine.createSpyObj`, assert `track` called with correct event string and properties |
| Unit | Non-blocking behavior | Simulate TelemetryService throwing, assert wizard flow continues |
| Unit | Wizard timestamp accuracy | Assert `time_spent_ms` is a positive number on `wizard_step_completed` |

## Migration / Rollout

No migration required. Telemetry is fire-and-forget. Events start flowing immediately after deploy. The NoOpProvider ensures zero impact in dev environments.

## Open Questions

None.
