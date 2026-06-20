import { NoOpProvider } from './noop.provider';

describe('NoOpProvider', () => {
  let provider: NoOpProvider;

  beforeEach(() => {
    provider = new NoOpProvider();
  });

  describe('init', () => {
    it('should not throw when called with apiKey and host', () => {
      expect(() => provider.init('any-key', 'https://any.host')).not.toThrow();
    });
  });

  describe('track', () => {
    it('should not throw when called with event and properties', () => {
      expect(() => provider.track('$pageview', { path: '/home' })).not.toThrow();
    });

    it('should not throw when called with empty properties', () => {
      expect(() => provider.track('auth_sign_out', {})).not.toThrow();
    });
  });

  describe('identify', () => {
    it('should not throw when called with userId and traits', () => {
      expect(() => provider.identify('user-1', { email: 'test@test.com', role: 'admin' })).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should not throw when called', () => {
      expect(() => provider.reset()).not.toThrow();
    });
  });

  describe('setSessionRecording', () => {
    it('should not throw when enabled', () => {
      expect(() => provider.setSessionRecording(true)).not.toThrow();
    });

    it('should not throw when disabled', () => {
      expect(() => provider.setSessionRecording(false)).not.toThrow();
    });
  });

  describe('setHeatmaps', () => {
    it('should not throw when enabled', () => {
      expect(() => provider.setHeatmaps(true)).not.toThrow();
    });

    it('should not throw when disabled', () => {
      expect(() => provider.setHeatmaps(false)).not.toThrow();
    });
  });
});
