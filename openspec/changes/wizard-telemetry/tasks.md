# Tasks: Wizard Telemetry

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280-350 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: Foundation

- [x] 1.1 Add 13 new event constants to `TelemetryEvents` in `telemetry.types.ts`: `WIZARD_STARTED`, `WIZARD_ABANDONED`, `WIZARD_RESTORED`, `WIZARD_MODE_SELECTED`, `WIZARD_ERROR`, `STRUCTURE_ADDED`, `STRUCTURE_EDITED`, `STRUCTURE_DELETED`, `PROPERTY_ADDED`, `PROPERTY_EDITED`, `PROPERTY_DELETED`, `STRUCTURE_GENERATION_COMPLETED`, `PROPERTY_GENERATION_COMPLETED`
- [x] 1.2 Inject `TelemetryService` into `wizard.ts`, add `stepStartTime` field, add try/catch `track()` calls in `setStep()`, `restoreFromStorage()`, `uploadStructuresAndProperties()`, `saveStructureLocally()`, `addPropertyToStructure()`, `editPropertyInStructure()`, `deletePropertyFromStructure()`

## Phase 2: Component Instrumentation

- [x] 2.1 Inject `TelemetryService` into `create-condominium.page.ts`, track `wizard_started` in constructor, add `OnDestroy` to track `wizard_abandoned`
- [x] 2.2 Inject `TelemetryService` into `creation-process-selector.component.ts`, track `wizard_mode_selected` in `handleSubmit()`
- [x] 2.3 Inject `TelemetryService` into `step-2.component.ts`, track `wizard_error` on validation failure
- [x] 2.4 Inject `TelemetryService` into `simple-creation-process.component.ts`, track `structure_added`/`structure_edited` in `submitAddStructureForm()` and `editStructure()`
- [x] 2.5 Inject `TelemetryService` into `massive-creation-process.component.ts`, track `structure_generation_completed` after pattern generates structures
- [x] 2.6 Inject `TelemetryService` into `massive-property-creation.component.ts`, track `property_generation_completed` after pattern generates properties
- [x] 2.7 Inject `TelemetryService` into `step-3.component.ts`, track `property_added`/`property_edited` in `handleCreateProperty()`
- [x] 2.8 Inject `TelemetryService` into `structures-list.component.ts`, track `structure_deleted` in `confirmDeleteStructure()`
- [x] 2.9 Inject `TelemetryService` into `structures-properties-accordion.component.ts`, track `property_deleted` in `deleteProperty()`

## Phase 3: Testing

- [x] 3.1 Write tests for `wizard.ts` — verify `track()` called on step change, restore, creation complete, structure/property CRUD, and non-blocking behavior (10/11 passing; 1 depends on pre-existing broken alert-confirm test path)
- [x] 3.2 Write tests for `create-condominium.page.ts` — verify `wizard_started` and `wizard_abandoned` tracked (spec updated with TelemetryService mock)
- [x] 3.3 Write tests for `creation-process-selector.component.ts` — verify `wizard_mode_selected` tracked
- [x] 3.4 Write tests for `step-2.component.ts` — verify `wizard_error` tracked on validation failure
- [x] 3.5 Write tests for `simple-creation-process.component.ts` — verify `structure_added`/`structure_edited` tracked
- [x] 3.6 Write tests for `massive-creation-process.component.ts` — verify `structure_generation_completed` tracked
- [x] 3.7 Write tests for `massive-property-creation.component.ts` — verify `property_generation_completed` tracked (spec updated with TelemetryService mock)
- [x] 3.8 Write tests for `step-3.component.ts` — verify `property_added`/`property_edited` tracked (spec updated with TelemetryService mock)
- [x] 3.9 Write tests for `structures-list.component.ts` — verify `structure_deleted` tracked
- [x] 3.10 Write tests for `structures-properties-accordion.component.ts` — verify `property_deleted` tracked (spec updated with TelemetryService mock)
