import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { JoinCondominiumPage } from './join-condominium.page';
import { CondominiumJoinRequest } from '@core/services/condominium-join-request/condominium-join-request';
import { PendingInvitation } from '@core/services/pending-invitation/pending-invitation';
import { TelemetryService } from '@core/services/telemetry/telemetry.service';
import { AlertController } from '@ionic/angular/standalone';

describe('JoinCondominiumPage', () => {
  let component: JoinCondominiumPage;
  let fixture: ComponentFixture<JoinCondominiumPage>;
  let router: Router;
  let route: ActivatedRoute;
  let joinRequestService: CondominiumJoinRequest;
  let pendingInvitation: PendingInvitation;
  let telemetryService: TelemetryService;
  let alertController: AlertController;

  beforeEach(async () => {
    const routeMock = {
      snapshot: {
        queryParamMap: {
          get: jasmine.createSpy('get').and.returnValue(null),
        },
      },
    };

    const alertControllerMock = {
      create: jasmine.createSpy('create').and.returnValue(
        Promise.resolve({
          present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
        })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [JoinCondominiumPage, SharedTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: AlertController, useValue: alertControllerMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    route = TestBed.inject(ActivatedRoute);
    joinRequestService = TestBed.inject(CondominiumJoinRequest);
    pendingInvitation = TestBed.inject(PendingInvitation);
    telemetryService = TestBed.inject(TelemetryService);
    alertController = TestBed.inject(AlertController);

    fixture = TestBed.createComponent(JoinCondominiumPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should check URL param first', () => {
      const routeMock = route as any;
      routeMock.snapshot.queryParamMap.get.and.returnValue('123456');

      component.ngOnInit();

      expect(component.invitationCode()).toBe('123456');
    });

    it('should fallback to localStorage if no URL param', () => {
      const routeMock = route as any;
      routeMock.snapshot.queryParamMap.get.and.returnValue(null);
      spyOn(pendingInvitation, 'getCode').and.returnValue('654321');

      component.ngOnInit();

      expect(component.invitationCode()).toBe('654321');
    });

    it('should auto-submit if code is found', () => {
      const routeMock = route as any;
      routeMock.snapshot.queryParamMap.get.and.returnValue('123456');
      spyOn(component, 'handleSubmit');

      component.ngOnInit();

      expect(component.handleSubmit).toHaveBeenCalled();
    });
  });

  describe('handleSubmit', () => {
    it('should show error if code length is not 6', async () => {
      component.invitationCode.set('123');
      await component.handleSubmit();
      expect(component.error()).toBe('join.invalidCode');
    });

    it('should call joinRequestService.submitJoinRequest with code', async () => {
      spyOn(joinRequestService, 'submitJoinRequest').and.returnValue(
        Promise.resolve({ success: true })
      );
      component.invitationCode.set('123456');

      await component.handleSubmit();

      expect(joinRequestService.submitJoinRequest).toHaveBeenCalledWith('123456');
    });

    it('should show error message on failure', async () => {
      spyOn(joinRequestService, 'submitJoinRequest').and.returnValue(
        Promise.resolve({ success: false, error: 'not_found' })
      );
      component.invitationCode.set('123456');

      await component.handleSubmit();

      expect(component.error()).toBe('join.notFound');
    });

    it('should clear pending invitation on success', async () => {
      spyOn(joinRequestService, 'submitJoinRequest').and.returnValue(
        Promise.resolve({ success: true })
      );
      spyOn(pendingInvitation, 'clearCode');
      component.invitationCode.set('123456');

      await component.handleSubmit();

      expect(pendingInvitation.clearCode).toHaveBeenCalled();
    });

    it('should track telemetry on success', async () => {
      spyOn(joinRequestService, 'submitJoinRequest').and.returnValue(
        Promise.resolve({ success: true })
      );
      spyOn(telemetryService, 'track');
      component.invitationCode.set('123456');

      await component.handleSubmit();

      expect(telemetryService.track).toHaveBeenCalledWith(
        'join_request_submitted',
        jasmine.objectContaining({ code: '123***' })
      );
    });

    it('should navigate to home on success', async () => {
      spyOn(joinRequestService, 'submitJoinRequest').and.returnValue(
        Promise.resolve({ success: true })
      );
      spyOn(router, 'navigate');
      component.invitationCode.set('123456');

      await component.handleSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should not break if telemetry throws error', async () => {
      spyOn(joinRequestService, 'submitJoinRequest').and.returnValue(
        Promise.resolve({ success: true })
      );
      spyOn(telemetryService, 'track').and.throwError('Telemetry error');
      component.invitationCode.set('123456');

      await expectAsync(component.handleSubmit()).toBeResolved();
    });
  });

  describe('mapErrorToTranslationKey', () => {
    it('should map not_found error', () => {
      const result = (component as any).mapErrorToTranslationKey('not_found');
      expect(result).toBe('join.notFound');
    });

    it('should map already_requested error', () => {
      const result = (component as any).mapErrorToTranslationKey('already_requested');
      expect(result).toBe('join.alreadyRequested');
    });

    it('should map unknown error', () => {
      const result = (component as any).mapErrorToTranslationKey('unknown');
      expect(result).toBe('join.error');
    });

    it('should map undefined error', () => {
      const result = (component as any).mapErrorToTranslationKey(undefined);
      expect(result).toBe('join.error');
    });
  });
});
