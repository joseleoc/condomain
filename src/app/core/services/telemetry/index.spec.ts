import { TestBed } from '@angular/core/testing';
import { provideTelemetry } from './index';
import { TELEMETRY_PROVIDER, TELEMETRY_ENABLED, TelemetryProvider } from './telemetry.types';

describe('provideTelemetry()', () => {
  describe('in dev mode (production=false)', () => {
    it('should NOT throw NG0201 — TELEMETRY_PROVIDER must always be available', () => {
      // This test proves the DI crash fix: provideTelemetry() must register
      // a provider even when telemetry is disabled (dev or missing API key).
      expect(() => {
        TestBed.configureTestingModule({
          providers: [provideTelemetry()],
        });

        // If TELEMETRY_PROVIDER is not registered, this throws NG0201
        const provider = TestBed.inject(TELEMETRY_PROVIDER);
        expect(provider).toBeDefined();
      }).not.toThrow();
    });

    it('should set TELEMETRY_ENABLED to false in dev mode', () => {
      TestBed.configureTestingModule({
        providers: [provideTelemetry()],
      });

      const enabled = TestBed.inject(TELEMETRY_ENABLED);
      expect(enabled).toBe(false);
    });

    it('should provide a TelemetryProvider that implements all methods', () => {
      TestBed.configureTestingModule({
        providers: [provideTelemetry()],
      });

      const provider = TestBed.inject(TELEMETRY_PROVIDER);
      expect(typeof provider.init).toBe('function');
      expect(typeof provider.track).toBe('function');
      expect(typeof provider.identify).toBe('function');
      expect(typeof provider.reset).toBe('function');
      expect(typeof provider.setSessionRecording).toBe('function');
      expect(typeof provider.setHeatmaps).toBe('function');
    });
  });
});
