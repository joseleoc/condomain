import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { JoinRequestsPage } from './join-requests.page';
import { CondominiumJoinRequest } from '@core/services/condominium-join-request/condominium-join-request';
import { ContextService } from '@core/services/context/context.service';
import { TelemetryService } from '@core/services/telemetry/telemetry.service';
import type { JoinRequestWithProfile } from '@app-types/join-request';

describe('JoinRequestsPage', () => {
  let component: JoinRequestsPage;
  let fixture: ComponentFixture<JoinRequestsPage>;
  let router: Router;
  let joinRequestService: CondominiumJoinRequest;
  let contextService: ContextService;
  let telemetryService: TelemetryService;

  const mockRequests: JoinRequestWithProfile[] = [
    {
      id: 'request-1',
      condominium_id: 'condo-1',
      profile_id: 'profile-1',
      invitation_code: '123456',
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: {
        id: 'profile-1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: null,
      },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinRequestsPage, SharedTestingModule],
    }).compileComponents();

    router = TestBed.inject(Router);
    joinRequestService = TestBed.inject(CondominiumJoinRequest);
    contextService = TestBed.inject(ContextService);
    telemetryService = TestBed.inject(TelemetryService);

    fixture = TestBed.createComponent(JoinRequestsPage);
    component = fixture.componentInstance;

    // Mock contextService
    spyOn(contextService, 'activeCondominium').and.returnValue({
      id: 'condo-1',
      name: 'Test Condo',
    } as any);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load requests on init', () => {
      spyOn(component, 'loadRequests');
      component.ngOnInit();
      expect(component.loadRequests).toHaveBeenCalled();
    });
  });

  describe('loadRequests', () => {
    it('should fetch pending requests', async () => {
      spyOn(joinRequestService, 'fetchPendingRequests').and.returnValue(
        Promise.resolve(mockRequests)
      );

      await component.loadRequests();

      expect(joinRequestService.fetchPendingRequests).toHaveBeenCalledWith('condo-1');
      expect(component.requests()).toEqual(mockRequests);
      expect(component.loading()).toBeFalse();
    });

    it('should navigate to home if no active condominium', async () => {
      spyOn(contextService, 'activeCondominium').and.returnValue(null);
      spyOn(router, 'navigate');

      await component.loadRequests();

      expect(router.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  describe('confirmAction', () => {
    it('should open assign property modal for approval', async () => {
      component.requests.set(mockRequests);

      await component.confirmAction('request-1', 'approve');

      expect(component.assignPropertyModalOpen()).toBeTrue();
      expect(component.pendingApprovalRequest()).toEqual(mockRequests[0]);
    });

    it('should open alert for decline', async () => {
      component.requests.set(mockRequests);

      await component.confirmAction('request-1', 'decline');

      expect(component.alertOpen()).toBeTrue();
      expect(component.alertData()?.requestId).toBe('request-1:decline');
    });
  });

  describe('handlePropertyAssigned', () => {
    it('should approve request with property', async () => {
      const mockProperty = { id: 'property-1', name: 'Apt 101' } as any;
      component.pendingApprovalRequest.set(mockRequests[0]);
      spyOn(joinRequestService, 'approveRequestWithProperty').and.returnValue(
        Promise.resolve(true)
      );

      await component.handlePropertyAssigned(mockProperty);

      expect(joinRequestService.approveRequestWithProperty).toHaveBeenCalledWith(
        'request-1',
        'property-1'
      );
      expect(component.assignPropertyModalOpen()).toBeFalse();
      expect(component.pendingApprovalRequest()).toBeNull();
    });

    it('should remove request from list on success', async () => {
      const mockProperty = { id: 'property-1', name: 'Apt 101' } as any;
      component.requests.set(mockRequests);
      component.pendingApprovalRequest.set(mockRequests[0]);
      spyOn(joinRequestService, 'approveRequestWithProperty').and.returnValue(
        Promise.resolve(true)
      );

      await component.handlePropertyAssigned(mockProperty);

      expect(component.requests().length).toBe(0);
    });

    it('should track telemetry on success', async () => {
      const mockProperty = { id: 'property-1', name: 'Apt 101' } as any;
      component.pendingApprovalRequest.set(mockRequests[0]);
      spyOn(joinRequestService, 'approveRequestWithProperty').and.returnValue(
        Promise.resolve(true)
      );
      spyOn(telemetryService, 'track');

      await component.handlePropertyAssigned(mockProperty);

      expect(telemetryService.track).toHaveBeenCalledWith(
        'join_request_approved',
        jasmine.objectContaining({ request_id: 'request-1', property_id: 'property-1' })
      );
      expect(telemetryService.track).toHaveBeenCalledWith(
        'join_request_property_assigned',
        jasmine.objectContaining({ request_id: 'request-1', property_id: 'property-1' })
      );
    });

    it('should show error toast on failure', async () => {
      const mockProperty = { id: 'property-1', name: 'Apt 101' } as any;
      component.pendingApprovalRequest.set(mockRequests[0]);
      spyOn(joinRequestService, 'approveRequestWithProperty').and.returnValue(
        Promise.resolve(false)
      );

      await component.handlePropertyAssigned(mockProperty);

      expect(component.toastOpen()).toBeTrue();
      expect(component.toastMessage()).toContain('error');
    });
  });

  describe('handleAlertConfirm', () => {
    it('should decline request', async () => {
      component.alertData.set({
        header: 'Decline',
        message: 'Are you sure?',
        requestId: 'request-1:decline',
      });
      spyOn(joinRequestService, 'declineRequest').and.returnValue(Promise.resolve(true));

      await component.handleAlertConfirm('decline');

      expect(joinRequestService.declineRequest).toHaveBeenCalledWith('request-1');
    });

    it('should remove request from list on success', async () => {
      component.requests.set(mockRequests);
      component.alertData.set({
        header: 'Decline',
        message: 'Are you sure?',
        requestId: 'request-1:decline',
      });
      spyOn(joinRequestService, 'declineRequest').and.returnValue(Promise.resolve(true));

      await component.handleAlertConfirm('decline');

      expect(component.requests().length).toBe(0);
    });

    it('should track telemetry on success', async () => {
      component.alertData.set({
        header: 'Decline',
        message: 'Are you sure?',
        requestId: 'request-1:decline',
      });
      spyOn(joinRequestService, 'declineRequest').and.returnValue(Promise.resolve(true));
      spyOn(telemetryService, 'track');

      await component.handleAlertConfirm('decline');

      expect(telemetryService.track).toHaveBeenCalledWith(
        'join_request_declined',
        jasmine.objectContaining({ request_id: 'request-1' })
      );
    });
  });

  describe('getUserName', () => {
    it('should return name if available', () => {
      const result = component.getUserName(mockRequests[0]);
      expect(result).toBe('John Doe');
    });

    it('should return email if name is not available', () => {
      const requestWithoutName = {
        ...mockRequests[0],
        profiles: { ...mockRequests[0].profiles, name: null },
      };
      const result = component.getUserName(requestWithoutName);
      expect(result).toBe('john@example.com');
    });

    it('should return "Unknown user" if neither name nor email', () => {
      const requestWithoutInfo = {
        ...mockRequests[0],
        profiles: { ...mockRequests[0].profiles, name: null, email: null },
      };
      const result = component.getUserName(requestWithoutInfo);
      expect(result).toBe('Unknown user');
    });
  });

  describe('getUserInitials', () => {
    it('should return initials from full name', () => {
      const result = component.getUserInitials(mockRequests[0]);
      expect(result).toBe('JD');
    });

    it('should return first letter if only one name', () => {
      const requestWithOneName = {
        ...mockRequests[0],
        profiles: { ...mockRequests[0].profiles, name: 'John' },
      };
      const result = component.getUserInitials(requestWithOneName);
      expect(result).toBe('J');
    });

    it('should return "?" if no name', () => {
      const requestWithoutName = {
        ...mockRequests[0],
        profiles: { ...mockRequests[0].profiles, name: null },
      };
      const result = component.getUserInitials(requestWithoutName);
      expect(result).toBe('?');
    });
  });
});
