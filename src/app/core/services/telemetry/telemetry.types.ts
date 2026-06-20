import { InjectionToken } from '@angular/core';

export interface TelemetryProvider {
  init(apiKey: string, host: string): void;
  track(event: TelemetryEvent, properties: Record<string, unknown>): void;
  identify(userId: string, traits: UserTraits): void;
  reset(): void;
  setSessionRecording(enabled: boolean): void;
  setHeatmaps(enabled: boolean): void;
}

export const TelemetryEvents = {
  PAGE_VIEW: '$pageview',
  SIGN_UP: 'auth_sign_up_completed',
  SIGN_IN: 'auth_sign_in_completed',
  SIGN_OUT: 'auth_sign_out',
  WIZARD_STEP_COMPLETED: 'wizard_step_completed',
  WIZARD_CREATION_COMPLETED: 'wizard_creation_completed',
  PROPERTY_SELECTED: 'property_selected',
  CONDOMINIUM_SELECTED: 'condominium_selected',
} as const;

export type TelemetryEvent = (typeof TelemetryEvents)[keyof typeof TelemetryEvents];

export interface UserTraits {
  email: string;
  role: string;
}

export interface PageViewProperties {
  path: string;
  title: string;
}

export const TELEMETRY_PROVIDER = new InjectionToken<TelemetryProvider>(
  'TELEMETRY_PROVIDER',
);

export const TELEMETRY_ENABLED = new InjectionToken<boolean>(
  'TELEMETRY_ENABLED',
  { providedIn: 'root', factory: () => false },
);
