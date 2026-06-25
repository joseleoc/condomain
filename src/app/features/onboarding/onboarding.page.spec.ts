import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { OnboardingPage } from './onboarding.page';
import { TelemetryService } from '@core/services/telemetry/telemetry.service';

describe('OnboardingPage', () => {
  let component: OnboardingPage;
  let fixture: ComponentFixture<OnboardingPage>;
  let router: Router;
  let telemetryService: TelemetryService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingPage, SharedTestingModule],
    }).compileComponents();

    router = TestBed.inject(Router);
    telemetryService = TestBed.inject(TelemetryService);

    fixture = TestBed.createComponent(OnboardingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('selectRole', () => {
    it('should set selected role', () => {
      component.selectRole('admin');
      expect(component.selectedRole()).toBe('admin');

      component.selectRole('owner');
      expect(component.selectedRole()).toBe('owner');
    });

    it('should track telemetry event', () => {
      spyOn(telemetryService, 'track');
      component.selectRole('admin');
      expect(telemetryService.track).toHaveBeenCalledWith('onboarding_role_selected', { role: 'admin' });
    });

    it('should not break if telemetry throws error', () => {
      spyOn(telemetryService, 'track').and.throwError('Telemetry error');
      expect(() => component.selectRole('admin')).not.toThrow();
    });
  });

  describe('handleContinue', () => {
    it('should not navigate if no role selected', () => {
      spyOn(router, 'navigate');
      component.handleContinue();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to create-condominium when admin is selected', () => {
      spyOn(router, 'navigate');
      component.selectRole('admin');
      component.handleContinue();
      expect(router.navigate).toHaveBeenCalledWith(['/create-condominium']);
    });

    it('should navigate to join-condominium when owner is selected', () => {
      spyOn(router, 'navigate');
      component.selectRole('owner');
      component.handleContinue();
      expect(router.navigate).toHaveBeenCalledWith(['/onboarding/join-condominium']);
    });
  });
});
