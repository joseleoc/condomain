import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { CondoDashboardCardComponent } from './condo-dashboard-card.component';
import { Toast } from '@core/services/toast/toast';
import { TelemetryService } from '@core/services/telemetry/telemetry.service';
import type { CondominiumWithRole } from '@app-types/condominium';
import type { CondominiumInvitationCode } from '@app-types/condominium-invitation-code';

describe('CondoDashboardCardComponent', () => {
  let component: CondoDashboardCardComponent;
  let fixture: ComponentFixture<CondoDashboardCardComponent>;
  let router: Router;
  let toast: Toast;
  let telemetryService: TelemetryService;

  const mockCondominium: CondominiumWithRole = {
    id: 'condo-1',
    name: 'Test Condominium',
    address: '123 Test St',
    currency: 'USD',
    owner_id: 'owner-1',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    role_id: 'role-1',
  };

  const mockInvitationCode: CondominiumInvitationCode = {
    id: 'code-1',
    condominium_id: 'condo-1',
    code: '123456',
    max_uses: null,
    uses_count: 0,
    expires_at: null,
    active: true,
    created_by: 'user-1',
    version: 1,
    idempotency_key: 'key-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CondoDashboardCardComponent, SharedTestingModule],
    }).compileComponents();

    router = TestBed.inject(Router);
    toast = TestBed.inject(Toast);
    telemetryService = TestBed.inject(TelemetryService);

    fixture = TestBed.createComponent(CondoDashboardCardComponent);
    component = fixture.componentInstance;

    // Set required inputs using fixture.componentRef.setInput
    fixture.componentRef.setInput('condominium', mockCondominium);
    fixture.componentRef.setInput('structureCount', 5);
    fixture.componentRef.setInput('propertyCount', 20);
    fixture.componentRef.setInput('pendingRequestsCount', 0);
    fixture.componentRef.setInput('invitationCode', null);
    fixture.componentRef.setInput('isAdmin', false);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('goToPendingRequests', () => {
    it('should navigate to join-requests page', () => {
      spyOn(router, 'navigate');
      component.goToPendingRequests();
      expect(router.navigate).toHaveBeenCalledWith(['/condominium/join-requests']);
    });
  });

  describe('copyToClipboard', () => {
    it('should not copy if no invitation code', () => {
      fixture.componentRef.setInput('invitationCode', null);
      spyOn(toast, 'present');
      spyOn(telemetryService, 'track');

      component.copyToClipboard();

      expect(toast.present).not.toHaveBeenCalled();
      expect(telemetryService.track).not.toHaveBeenCalled();
    });

    it('should copy code and show toast', async () => {
      fixture.componentRef.setInput('invitationCode', mockInvitationCode);
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      spyOn(toast, 'present');

      component.copyToClipboard();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('123456');
      expect(toast.present).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'condominium.hub.invitationCode.copiedToClipboard',
          duration: 2000,
        })
      );
    });

    it('should track telemetry event', async () => {
      fixture.componentRef.setInput('invitationCode', mockInvitationCode);
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      spyOn(toast, 'present');
      spyOn(telemetryService, 'track');

      component.copyToClipboard();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(telemetryService.track).toHaveBeenCalledWith(
        'invitation_code_copied',
        jasmine.objectContaining({ condominium_id: 'condo-1' })
      );
    });

    it('should not break if telemetry throws error', async () => {
      fixture.componentRef.setInput('invitationCode', mockInvitationCode);
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      spyOn(toast, 'present');
      spyOn(telemetryService, 'track').and.throwError('Telemetry error');

      expect(() => component.copyToClipboard()).not.toThrow();
    });
  });

  describe('onShowQrCode', () => {
    it('should emit showQrCode', () => {
      spyOn(component.showQrCode, 'emit');
      component.onShowQrCode();
      expect(component.showQrCode.emit).toHaveBeenCalled();
    });

    it('should track telemetry event', () => {
      spyOn(component.showQrCode, 'emit');
      spyOn(telemetryService, 'track');

      component.onShowQrCode();

      expect(telemetryService.track).toHaveBeenCalledWith(
        'invitation_qr_shown',
        jasmine.objectContaining({ condominium_id: 'condo-1' })
      );
    });

    it('should not break if telemetry throws error', () => {
      spyOn(component.showQrCode, 'emit');
      spyOn(telemetryService, 'track').and.throwError('Telemetry error');

      expect(() => component.onShowQrCode()).not.toThrow();
    });
  });
});
