# Product Telemetry Specification

## Purpose

Vendor-agnostic product telemetry via Adapter pattern. Page views, custom events, user identification, session recording, and heatmaps — swappable without touching consumer code.

## Requirements

### Requirement: Telemetry Provider Interface

The system SHALL define `TelemetryProvider` (via `InjectionToken`) declaring: `init()`, `track()`, `identify()`, `reset()`, `setSessionRecording()`, `setHeatmaps()`. App code depends on interface only.

#### Scenario: Interface injectable via DI token

- GIVEN app bootstrap configuration
- WHEN DI resolves `TELEMETRY_PROVIDER` token
- THEN it returns a `TelemetryProvider` conforming object swappable via registration change

### Requirement: Telemetry Service (Public API)

The system SHALL provide `TelemetryService` as `@Injectable({ providedIn: 'root' })` singleton delegating to the active `TelemetryProvider` via `inject()`. Consumers inject `TelemetryService` only.

#### Scenario: Service delegates to provider

- GIVEN component injects `TelemetryService`
- WHEN `track('event', { k: 'v' })` is called
- THEN call forwards to active `TelemetryProvider.track()` with zero vendor knowledge

### Requirement: Environment-Based Initialization

The system SHALL initialize the provider during bootstrap using `environment.posthogApiKey` and `environment.posthogHost`. MUST NOT initialize if key is absent or empty.

#### Scenario: Production initializes with valid key

- WHEN app bootstraps with `environment.production` true and non-empty key
- THEN `TelemetryProvider.init(key, host)` is called

#### Scenario: Missing key prevents initialization

- WHEN app bootstraps with undefined or empty key
- THEN `init()` is NOT called and a warning is logged

### Requirement: Dev/Production Gating

The system SHALL NOT send telemetry when `environment.production` is `false`. All tracking calls in dev SHALL be silently ignored.

#### Scenario: Dev blocks all tracking

- WHEN `TelemetryService.track('any')` is called in dev mode
- THEN no network request is made

#### Scenario: Production enables tracking

- WHEN `TelemetryService.track('any')` is called with provider initialized
- THEN event is sent to analytics backend

### Requirement: Page View Tracking

The system SHALL auto-track page views on every Angular Router `NavigationEnd` event, including route path and page title.

#### Scenario: Navigation triggers page view

- WHEN user navigates and router emits `NavigationEnd`
- THEN `track('$pageview', { path, title })` is called with resolved route

### Requirement: Custom Event Tracking

The system SHALL support custom events with typed event name (enum/const) and optional typed properties (no `any`).

#### Scenario: Track with properties

- WHEN `track('wizard_step_completed', { step: 2, mode: 'simple' })` is called
- THEN event and typed properties are sent

#### Scenario: Track without properties

- WHEN `track('button_clicked')` is called
- THEN event is sent with empty properties and no error

### Requirement: User Identification

The system SHALL call `identify(userId, { email, role })` after successful authentication to link subsequent events.

#### Scenario: Login triggers identification

- WHEN auth confirms successful sign-in
- THEN `TelemetryService.identify(userId, { email, role })` is called

#### Scenario: Identify is idempotent

- WHEN `identify()` called with same user ID
- THEN no duplicate identification; properties updated

### Requirement: User Reset on Logout

The system SHALL call `reset()` on sign-out to clear user-specific state and prevent cross-user contamination.

#### Scenario: Logout resets telemetry

- WHEN auth clears session on sign-out
- THEN `TelemetryService.reset()` is called; subsequent events are anonymous

### Requirement: Session Recording and Heatmap Toggles

The system SHALL enable/disable session recording via `setSessionRecording(boolean)` and heatmaps via `setHeatmaps(boolean)`. Both enabled in prod, disabled in dev.

#### Scenario: Features toggle by environment

- WHEN app initializes in production
- THEN `setSessionRecording(true)` and `setHeatmaps(true)` are called
- WHEN app initializes in dev
- THEN `setSessionRecording(false)` and `setHeatmaps(false)` are called

### Requirement: Provider Swap Capability

The system SHALL allow replacing the active provider by changing only the `InjectionToken` registration. No consumer code SHALL require modification.

#### Scenario: Swap provider implementation

- WHEN registration changes from `PosthogProvider` to `AnotherProvider` (implements `TelemetryProvider`)
- THEN all `TelemetryService` calls delegate to new provider with zero consumer changes

#### Scenario: Mock provider for testing

- WHEN test provides `MockTelemetryProvider` via token and calls `TelemetryService.track()`
- THEN mock records the call; no real backend contacted
