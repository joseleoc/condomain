import { PosthogProvider } from './posthog.provider';
import posthog from 'posthog-js';

describe('PosthogProvider', () => {
  let provider: PosthogProvider;

  beforeEach(() => {
    spyOn(posthog, 'init');
    spyOn(posthog, 'capture');
    spyOn(posthog, 'identify');
    spyOn(posthog, 'reset');
    spyOn(posthog, 'startSessionRecording');
    spyOn(posthog, 'stopSessionRecording');

    provider = new PosthogProvider();
  });

  describe('init', () => {
    it('should call posthog.init with apiKey, host, and config', () => {
      provider.init('test-api-key', 'https://test.posthog.com');

      expect(posthog.init).toHaveBeenCalledWith('test-api-key', jasmine.objectContaining({
        api_host: 'https://test.posthog.com',
        capture_pageview: false,
        mask_personal_data_properties: true,
        disable_session_recording: false,
        capture_heatmaps: true,
      }));
    });
  });

  describe('track', () => {
    it('should call posthog.capture with event name and properties', () => {
      provider.track('$pageview', { path: '/home', title: 'Home' });

      expect(posthog.capture).toHaveBeenCalledWith('$pageview', {
        path: '/home',
        title: 'Home',
      });
    });

    it('should call posthog.capture with empty properties when none provided', () => {
      provider.track('auth_sign_out', {});

      expect(posthog.capture).toHaveBeenCalledWith('auth_sign_out', {});
    });
  });

  describe('identify', () => {
    it('should call posthog.identify with userId and traits', () => {
      provider.identify('user-123', { email: 'user@test.com', role: 'admin' });

      expect(posthog.identify).toHaveBeenCalledWith('user-123', {
        email: 'user@test.com',
        role: 'admin',
      });
    });
  });

  describe('reset', () => {
    it('should call posthog.reset', () => {
      provider.reset();

      expect(posthog.reset).toHaveBeenCalled();
    });
  });

  describe('setSessionRecording', () => {
    it('should start session recording when true', () => {
      provider.setSessionRecording(true);

      expect(posthog.startSessionRecording).toHaveBeenCalled();
      expect(posthog.stopSessionRecording).not.toHaveBeenCalled();
    });

    it('should stop session recording when false', () => {
      provider.setSessionRecording(false);

      expect(posthog.stopSessionRecording).toHaveBeenCalled();
      expect(posthog.startSessionRecording).not.toHaveBeenCalled();
    });
  });

  describe('setHeatmaps', () => {
    it('should not throw when called', () => {
      expect(() => provider.setHeatmaps(true)).not.toThrow();
      expect(() => provider.setHeatmaps(false)).not.toThrow();
    });
  });
});
