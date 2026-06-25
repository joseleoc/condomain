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
  WIZARD_STARTED: 'wizard_started',
  WIZARD_STEP_COMPLETED: 'wizard_step_completed',
  WIZARD_CREATION_COMPLETED: 'wizard_creation_completed',
  WIZARD_ABANDONED: 'wizard_abandoned',
  WIZARD_RESTORED: 'wizard_restored',
  WIZARD_MODE_SELECTED: 'wizard_mode_selected',
  WIZARD_ERROR: 'wizard_error',
  STRUCTURE_ADDED: 'structure_added',
  STRUCTURE_EDITED: 'structure_edited',
  STRUCTURE_DELETED: 'structure_deleted',
  STRUCTURE_GENERATION_COMPLETED: 'structure_generation_completed',
  PROPERTY_ADDED: 'property_added',
  PROPERTY_EDITED: 'property_edited',
  PROPERTY_DELETED: 'property_deleted',
  PROPERTY_GENERATION_COMPLETED: 'property_generation_completed',
  PROPERTY_SELECTED: 'property_selected',
  CONDOMINIUM_SELECTED: 'condominium_selected',
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_ROLE_SELECTED: 'onboarding_role_selected',
  // Invitation codes
  INVITATION_CODE_COPIED: 'invitation_code_copied',
  INVITATION_QR_SHOWN: 'invitation_qr_shown',
  // Join requests
  JOIN_REQUEST_SUBMITTED: 'join_request_submitted',
  JOIN_REQUEST_APPROVED: 'join_request_approved',
  JOIN_REQUEST_DECLINED: 'join_request_declined',
  JOIN_REQUEST_PROPERTY_ASSIGNED: 'join_request_property_assigned',
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
