import { NgModule, signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { TELEMETRY_PROVIDER, TELEMETRY_ENABLED, NoOpProvider } from '@core/services/telemetry';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NetworkStatusService } from '@core/services/network-status.service';
import { LocalRepository } from '@core/services/sync/local-repository';
import { SyncService } from '@core/services/sync/sync-service';

/**
 * Shared testing module that provides common dependencies for all tests.
 * Import this in TestBed.configureTestingModule to get:
 * - Transloco (with empty langs for fast tests)
 * - Telemetry (NoOpProvider, disabled)
 * - NoopAnimations (prevents animation-related test failures)
 * - NetworkStatusService (mocked as always online)
 * - LocalRepository (mocked with no-op methods)
 * - SyncService (mocked with no-op methods)
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
    provideNoopAnimations(),
    {
      provide: NetworkStatusService,
      useValue: { isOnline: signal(true) },
    },
    {
      provide: LocalRepository,
      useValue: {
        getEntitiesByType: () => Promise.resolve([]),
        getById: () => Promise.resolve(undefined),
        upsert: () => Promise.resolve(),
        enqueueMutation: () => Promise.resolve(0),
        getPendingMutations: () => Promise.resolve([]),
        deleteMutation: () => Promise.resolve(),
        updateMutationRetry: () => Promise.resolve(),
        getLastSyncAt: () => Promise.resolve(undefined),
        setLastSyncAt: () => Promise.resolve(),
      },
    },
    {
      provide: SyncService,
      useValue: {
        isOnline: () => true,
        enqueueMutation: () => Promise.resolve(),
        processOutbox: () => Promise.resolve(),
      },
    },
  ],
})
export class SharedTestingModule {}
