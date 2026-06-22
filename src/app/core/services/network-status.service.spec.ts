import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { NetworkStatusService } from './network-status.service';

describe('NetworkStatusService', () => {
  let service: NetworkStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
      providers: [NetworkStatusService],
    });
    service = TestBed.inject(NetworkStatusService);
  });

  describe('isOnline signal', () => {
    it('should be injectable and return a boolean', () => {
      const isOnline = service.isOnline();
      expect(typeof isOnline).toBe('boolean');
    });

    it('should reflect navigator.onLine on web platform', () => {
      // In headless Chrome, navigator.onLine is typically true
      const expectedOnline = navigator.onLine;
      expect(service.isOnline()).toBe(expectedOnline);
    });
  });

  describe('web fallback events', () => {
    it('should update signal to false on offline event', fakeAsync(() => {
      // Simulate offline event
      window.dispatchEvent(new Event('offline'));
      tick();

      expect(service.isOnline()).toBeFalse();
    }));

    it('should update signal to true on online event after offline', fakeAsync(() => {
      // Go offline first
      window.dispatchEvent(new Event('offline'));
      tick();
      expect(service.isOnline()).toBeFalse();

      // Go back online
      window.dispatchEvent(new Event('online'));
      tick();

      expect(service.isOnline()).toBeTrue();
    }));
  });
});
