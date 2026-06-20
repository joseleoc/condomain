import posthog from 'posthog-js';
import {
  TelemetryProvider,
  TelemetryEvent,
  UserTraits,
} from '../telemetry.types';

export class PosthogProvider implements TelemetryProvider {
  init(apiKey: string, host: string): void {
    posthog.init(apiKey, {
      api_host: host,
      capture_pageview: false,
      mask_personal_data_properties: true,
      disable_session_recording: false,
      capture_heatmaps: true,
      defaults: '2026-05-30',
    });
  }

  track(event: TelemetryEvent, properties: Record<string, unknown>): void {
    posthog.capture(event, properties);
  }

  identify(userId: string, traits: UserTraits): void {
    posthog.identify(userId, traits);
  }

  reset(): void {
    posthog.reset();
  }

  setSessionRecording(enabled: boolean): void {
    if (enabled) {
      posthog.startSessionRecording();
    } else {
      posthog.stopSessionRecording();
    }
  }

  setHeatmaps(enabled: boolean): void {
    // Heatmaps are configured at init time via capture_heatmaps.
    // Runtime toggling is not supported by posthog-js.
    void enabled;
  }
}
