import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { OfflineIndicatorComponent } from './offline-indicator.component';
import { NetworkStatusService } from '@core/services/network-status.service';

describe('OfflineIndicatorComponent', () => {
  let component: OfflineIndicatorComponent;
  let fixture: ComponentFixture<OfflineIndicatorComponent>;

  function setup(isOnline: boolean) {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule, OfflineIndicatorComponent],
      providers: [
        {
          provide: NetworkStatusService,
          useValue: { isOnline: signal(isOnline) },
        },
      ],
    });

    fixture = TestBed.createComponent(OfflineIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('when online', () => {
    beforeEach(() => setup(true));

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should not render the offline banner', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const banner = compiled.querySelector('[data-testid="offline-banner"]');
      expect(banner).toBeNull();
    });
  });

  describe('when offline', () => {
    beforeEach(() => setup(false));

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render the offline banner', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const banner = compiled.querySelector('[data-testid="offline-banner"]');
      expect(banner).toBeTruthy();
    });

    it('should display a warning message', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('offline');
    });
  });

  describe('reactivity', () => {
    it('should hide banner when going from offline to online', fakeAsync(() => {
      const onlineSignal = signal(false);

      TestBed.configureTestingModule({
        imports: [SharedTestingModule, IonicModule, OfflineIndicatorComponent],
        providers: [
          {
            provide: NetworkStatusService,
            useValue: { isOnline: onlineSignal },
          },
        ],
      });

      fixture = TestBed.createComponent(OfflineIndicatorComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Initially offline — banner should be visible
      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[data-testid="offline-banner"]')).toBeTruthy();

      // Go online
      onlineSignal.set(true);
      fixture.detectChanges();
      tick();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[data-testid="offline-banner"]')).toBeNull();
    }));

    it('should show banner when going from online to offline', fakeAsync(() => {
      const onlineSignal = signal(true);

      TestBed.configureTestingModule({
        imports: [SharedTestingModule, IonicModule, OfflineIndicatorComponent],
        providers: [
          {
            provide: NetworkStatusService,
            useValue: { isOnline: onlineSignal },
          },
        ],
      });

      fixture = TestBed.createComponent(OfflineIndicatorComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Initially online — banner should be hidden
      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[data-testid="offline-banner"]')).toBeNull();

      // Go offline
      onlineSignal.set(false);
      fixture.detectChanges();
      tick();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[data-testid="offline-banner"]')).toBeTruthy();
    }));
  });
});
