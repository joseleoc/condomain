import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { TelemetryService } from './telemetry.service';
import {
  TelemetryProvider,
  TELEMETRY_PROVIDER,
  TELEMETRY_ENABLED,
  TelemetryEvents,
  UserTraits,
} from './telemetry.types';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let mockProvider: jasmine.SpyObj<TelemetryProvider>;
  let routerEventsSubject: Subject<NavigationEnd>;
  let mockRouter: jasmine.SpyObj<Router>;

  function setup(enabled = false) {
    mockProvider = jasmine.createSpyObj<TelemetryProvider>('TelemetryProvider', [
      'init',
      'track',
      'identify',
      'reset',
      'setSessionRecording',
      'setHeatmaps',
    ]);

    routerEventsSubject = new Subject<NavigationEnd>();
    mockRouter = jasmine.createSpyObj('Router', [], {
      events: routerEventsSubject.asObservable(),
      url: '/home',
    });

    TestBed.configureTestingModule({
      providers: [
        TelemetryService,
        { provide: TELEMETRY_PROVIDER, useValue: mockProvider },
        { provide: TELEMETRY_ENABLED, useValue: enabled },
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(TelemetryService);
  }

  describe('dev gating', () => {
    beforeEach(() => setup(false));

    it('should NOT call provider.track when telemetry is disabled', () => {
      service.track(TelemetryEvents.SIGN_IN, { step: 1 });
      expect(mockProvider.track).not.toHaveBeenCalled();
    });

    it('should NOT call provider.identify when telemetry is disabled', () => {
      const traits: UserTraits = { email: 'test@test.com', role: 'admin' };
      service.identify('user-1', traits);
      expect(mockProvider.identify).not.toHaveBeenCalled();
    });

    it('should NOT call provider.reset when telemetry is disabled', () => {
      service.reset();
      expect(mockProvider.reset).not.toHaveBeenCalled();
    });
  });

  describe('production passthrough', () => {
    beforeEach(() => setup(true));

    it('should delegate track to provider when telemetry is enabled', () => {
      const props = { step: 2, mode: 'simple' };
      service.track(TelemetryEvents.WIZARD_STEP_COMPLETED, props);
      expect(mockProvider.track).toHaveBeenCalledWith(
        TelemetryEvents.WIZARD_STEP_COMPLETED,
        props,
      );
    });

    it('should delegate identify to provider when telemetry is enabled', () => {
      const traits: UserTraits = { email: 'user@test.com', role: 'owner' };
      service.identify('user-123', traits);
      expect(mockProvider.identify).toHaveBeenCalledWith('user-123', traits);
    });

    it('should delegate reset to provider when telemetry is enabled', () => {
      service.reset();
      expect(mockProvider.reset).toHaveBeenCalled();
    });

    it('should delegate track with empty properties', () => {
      service.track(TelemetryEvents.SIGN_OUT, {});
      expect(mockProvider.track).toHaveBeenCalledWith(
        TelemetryEvents.SIGN_OUT,
        {},
      );
    });
  });

  describe('page view tracking', () => {
    beforeEach(() => setup(true));

    it('should track $pageview on NavigationEnd event', fakeAsync(() => {
      const navEnd = new NavigationEnd(1, '/home', '/home');
      routerEventsSubject.next(navEnd);
      tick();

      expect(mockProvider.track).toHaveBeenCalledWith('$pageview', {
        path: '/home',
        title: '/home',
      });

      flush();
    }));

    it('should NOT track pageview when telemetry is disabled', fakeAsync(() => {
      TestBed.resetTestingModule();
      setup(false);

      const navEnd = new NavigationEnd(1, '/home', '/home');
      routerEventsSubject.next(navEnd);
      tick();

      expect(mockProvider.track).not.toHaveBeenCalled();

      flush();
    }));
  });
});
