# Wizard Telemetry Specification

## Purpose

Define the telemetry events, context properties, and behavioral rules for instrumenting the create-condominium wizard. All events are observational — they MUST NOT alter wizard behavior or block user flow.

## Requirements

### Requirement: Non-blocking instrumentation

The system MUST NOT throw, reject, or prevent wizard progression when telemetry fails.

#### Scenario: Telemetry error on wizard_started

- GIVEN the TelemetryService is unavailable or throws
- WHEN the CreateCondominiumPage initializes
- THEN the page MUST render normally and `wizard_started` MUST NOT block page load

### Requirement: wizard_started event

The system MUST fire `wizard_started` when the user enters the create-condominium page.

#### Scenario: Page loaded

- GIVEN the user navigates to the create-condominium page
- WHEN the page constructor or lifecycle init runs
- THEN a `wizard_started` event MUST be tracked with properties: `{ step: 1 }`

### Requirement: wizard_step_completed event

The system MUST fire `wizard_step_completed` on each forward step transition with time spent on the previous step.

#### Scenario: Forward step transition

- GIVEN the user is on step N and triggers next
- WHEN `setStep(N+1)` is called
- THEN a `wizard_step_completed` event MUST be tracked with properties: `{ from_step: N, to_step: N+1, time_spent_ms: <number>, creation_mode: <string|null> }`

### Requirement: wizard_creation_completed event

The system MUST fire `wizard_creation_completed` when structures and properties are successfully uploaded to the backend.

#### Scenario: Creation succeeds

- GIVEN the user has completed the wizard
- WHEN `uploadStructuresAndProperties` succeeds
- THEN a `wizard_creation_completed` event MUST be tracked with properties: `{ structures_count: <number>, properties_count: <number>, creation_mode: <string> }`

### Requirement: wizard_abandoned event

The system MUST fire `wizard_abandoned` when the user leaves the create-condominium page without completing.

#### Scenario: User navigates away

- GIVEN the user is on any wizard step
- WHEN the page's `ngOnDestroy` is triggered
- THEN a `wizard_abandoned` event MUST be tracked with properties: `{ step: <number> }`

### Requirement: wizard_restored event

The system MUST fire `wizard_restored` when the user restores previously saved wizard state from localStorage.

#### Scenario: User restores progress

- GIVEN the user has saved wizard state and returns to the page
- WHEN the user selects "Continue" on the restore dialog
- THEN a `wizard_restored` event MUST be tracked with properties: `{ step: <number>, creation_mode: <string|null> }`

### Requirement: wizard_mode_selected event

The system MUST fire `wizard_mode_selected` when the user selects a creation mode.

#### Scenario: Mode selected

- GIVEN the user is on step 2 and has chosen a mode
- WHEN the selection is confirmed via `onSelectionSubmitted`
- THEN a `wizard_mode_selected` event MUST be tracked with properties: `{ mode: 'simple'|'massive'|'ai' }`

### Requirement: wizard_error event

The system SHOULD fire `wizard_error` on validation failures and API errors during the wizard flow.

#### Scenario: Validation failure

- GIVEN the user attempts to proceed with invalid data
- WHEN step 2 validation detects no structures and no mode selected
- THEN a `wizard_error` event SHOULD be tracked with properties: `{ error_type: 'validation', step: 2, message: <string> }`

### Requirement: Structure CRUD events

The system MUST fire `structure_added`, `structure_edited`, and `structure_deleted` when users add, edit, or delete structures.

#### Scenario: Structure added

- GIVEN the user is on step 2
- WHEN `saveStructureLocally` succeeds for a new structure
- THEN `structure_added` MUST be tracked with properties: `{ mode: 'simple'|'massive', structures_count: <number> }`

#### Scenario: Structure deleted

- GIVEN the user has at least one structure
- WHEN `confirmDeleteStructure` removes a structure
- THEN `structure_deleted` MUST be tracked with properties: `{ structures_count: <number> }`

### Requirement: Property CRUD events

The system MUST fire `property_added`, `property_edited`, and `property_deleted` when users add, edit, or delete properties.

#### Scenario: Property added

- GIVEN the user is on step 3 or in massive property mode
- WHEN `addPropertyToStructure` succeeds for a new property
- THEN `property_added` MUST be tracked with properties: `{ structure_name: <string>, has_owner: <boolean>, fee: <number> }`

#### Scenario: Property deleted

- GIVEN the user has at least one property
- WHEN `deletePropertyFromStructure` removes a property
- THEN `property_deleted` MUST be tracked with properties: `{ structure_name: <string> }`

### Requirement: Generation events

The system MUST fire `structure_generation_completed` and `property_generation_completed` when massive mode generates structures or properties.

#### Scenario: Massive structures generated

- GIVEN the user is in massive mode on step 2
- WHEN the pattern generates and saves N structures
- THEN `structure_generation_completed` MUST be tracked with properties: `{ count: <number>, mode: 'massive' }`

#### Scenario: Massive properties generated

- GIVEN the user is in massive mode on step 3
- WHEN the pattern generates properties
- THEN `property_generation_completed` MUST be tracked with properties: `{ count: <number>, mode: 'massive' }`
