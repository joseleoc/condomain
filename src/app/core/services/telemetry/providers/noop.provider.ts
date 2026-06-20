import { TelemetryProvider, TelemetryEvent, UserTraits } from '../telemetry.types';

/**
 * No-op implementation of TelemetryProvider.
 * Used in development and when PostHog API key is not configured.
 */
export class NoOpProvider implements TelemetryProvider {
  init(_apiKey: string, _host: string): void {
    // No-op: telemetry disabled
  }

  track(_event: TelemetryEvent, _properties: Record<string, unknown>): void {
    // No-op: telemetry disabled
  }

  identify(_userId: string, _traits: UserTraits): void {
    // No-op: telemetry disabled
  }

  reset(): void {
    // No-op: telemetry disabled
  }

  setSessionRecording(_enabled: boolean): void {
    // No-op: telemetry disabled
  }

  setHeatmaps(_enabled: boolean): void {
    // No-op: posthog-js does not support runtime heatmap toggling.
    // Heatmaps are configured at init time via capture_heatmaps option.
  }
}
