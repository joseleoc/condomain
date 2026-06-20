import { inject, Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  TelemetryProvider,
  TELEMETRY_PROVIDER,
  TELEMETRY_ENABLED,
  TelemetryEvent,
  UserTraits,
} from './telemetry.types';

@Injectable({
  providedIn: 'root',
})
export class TelemetryService {
  private provider = inject(TELEMETRY_PROVIDER);
  private router = inject(Router);
  private isEnabled = inject(TELEMETRY_ENABLED);

  constructor() {
    if (this.isEnabled) {
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => {
          this.provider.track('$pageview', {
            path: event.urlAfterRedirects || event.url,
            title: this.resolvePageTitle(event.urlAfterRedirects || event.url),
          });
        });
    }
  }

  track(event: TelemetryEvent, properties: Record<string, unknown> = {}): void {
    if (!this.isEnabled) {
      return;
    }
    this.provider.track(event, properties);
  }

  identify(userId: string, traits: UserTraits): void {
    if (!this.isEnabled) {
      return;
    }
    this.provider.identify(userId, traits);
  }

  reset(): void {
    if (!this.isEnabled) {
      return;
    }
    this.provider.reset();
  }

  private resolvePageTitle(url: string): string {
    return url;
  }
}
