export { TelemetryService } from './telemetry.service';
export { PosthogProvider } from './providers/posthog.provider';
export { NoOpProvider } from './providers/noop.provider';
export {
  TelemetryProvider,
  TELEMETRY_PROVIDER,
  TELEMETRY_ENABLED,
  TelemetryEvents,
  TelemetryEvent,
  UserTraits,
  PageViewProperties,
} from './telemetry.types';

import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';
import { TELEMETRY_PROVIDER, TELEMETRY_ENABLED } from './telemetry.types';
import { PosthogProvider } from './providers/posthog.provider';
import { NoOpProvider } from './providers/noop.provider';
import { environment } from 'src/environments/environment';

export function provideTelemetry(): EnvironmentProviders {
  const providers: Provider[] = [];

  const apiKey = environment.posthogApiKey;
  const host = environment.posthogHost || 'https://app.posthog.com';

  if (environment.production && apiKey) {
    providers.push({
      provide: TELEMETRY_PROVIDER,
      useClass: PosthogProvider,
    });
    providers.push({
      provide: TELEMETRY_ENABLED,
      useValue: true,
    });

    const provider = new PosthogProvider();
    provider.init(apiKey, host);
  } else {
    // Always register TELEMETRY_PROVIDER to prevent NG0201 DI crash.
    // Use NoOpProvider when telemetry is disabled (dev mode or missing API key).
    if (!environment.production || !apiKey) {
      console.warn(
        '[Telemetry] PostHog is disabled. ' +
          (environment.production
            ? 'posthogApiKey is missing or empty.'
            : 'Running in development mode.'),
      );
    }

    providers.push({
      provide: TELEMETRY_PROVIDER,
      useClass: NoOpProvider,
    });
    providers.push({
      provide: TELEMETRY_ENABLED,
      useValue: false,
    });
  }

  return makeEnvironmentProviders(providers);
}
