# Network Awareness Specification

## Purpose

Define the `@capacitor/network` integration that provides online/offline status as a reactive Angular Signal, usable by any component or service.

## Requirements

### Requirement: Network Status as Injectable Signal

The network status MUST be exposed as an Angular `Signal<boolean>` that any component or service can inject.

#### Scenario: Signal is injectable

- WHEN a component injects the network status service
- THEN it can read `isOnline()` as a reactive signal

#### Scenario: Signal reflects current state

- GIVEN the device is online
- WHEN the signal is read
- THEN it returns `true`

### Requirement: Network Status Change Events

The service MUST listen to `@capacitor/network` status change events and update the signal accordingly.

#### Scenario: Signal updates on disconnect

- GIVEN the signal is `true` (online)
- WHEN the network disconnects
- THEN the signal becomes `false`

#### Scenario: Signal updates on reconnect

- GIVEN the signal is `false` (offline)
- WHEN the network reconnects
- THEN the signal becomes `true`

### Requirement: Web Fallback

On web platforms (where Capacitor is not available), the service MUST fall back to `navigator.onLine` and the browser `online`/`offline` events.

#### Scenario: Web uses navigator.onLine

- GIVEN the app is running in a browser (not Capacitor)
- WHEN the service initializes
- THEN it reads `navigator.onLine` for the initial state

#### Scenario: Web listens to browser events

- GIVEN the app is running in a browser
- WHEN the browser fires an `offline` event
- THEN the signal becomes `false`

### Requirement: Initial Status on Construction

The network status MUST be determined at service construction time, not deferred.

#### Scenario: Status is known immediately

- WHEN the service is instantiated
- THEN `isOnline()` returns the correct current state without waiting for an event

### Requirement: Singleton Service

The network status service MUST be a root-provided singleton so all consumers see the same state.

#### Scenario: Single instance across the app

- GIVEN component A and component B both inject the service
- WHEN component A reads `isOnline()`
- THEN it returns the same value as component B's read

## Acceptance Criteria

- [ ] Network status is available as an injectable Signal<boolean>
- [ ] Signal updates on Capacitor network events
- [ ] Web fallback uses navigator.onLine and browser events
- [ ] Initial status is correct at construction time
- [ ] Service is a root-provided singleton
- [ ] Service is covered by unit tests (80%+)
