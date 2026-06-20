import { NgModule } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { TELEMETRY_PROVIDER, TELEMETRY_ENABLED, NoOpProvider } from '@core/services/telemetry';

/**
 * Shared testing module that provides common dependencies for all tests.
 * Import this in TestBed.configureTestingModule to get:
 * - Transloco (with empty langs for fast tests)
 * - Telemetry (NoOpProvider, disabled)
 *
 * Usage:
 *   TestBed.configureTestingModule({
 *     imports: [SharedTestingModule, MyComponent],
 *   });
 */
@NgModule({
  imports: [
    TranslocoTestingModule.forRoot({
      langs: {},
      translocoConfig: {
        availableLangs: ['en', 'es'],
        defaultLang: 'es',
      },
      preloadLangs: false,
    }),
  ],
  providers: [
    { provide: TELEMETRY_PROVIDER, useClass: NoOpProvider },
    { provide: TELEMETRY_ENABLED, useValue: false },
  ],
})
export class SharedTestingModule {}
