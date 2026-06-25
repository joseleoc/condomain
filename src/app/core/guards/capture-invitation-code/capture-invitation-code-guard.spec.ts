import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { captureInvitationCodeGuard } from './capture-invitation-code-guard';
import { PendingInvitation } from '@core/services/pending-invitation/pending-invitation';

describe('captureInvitationCodeGuard', () => {
  let pendingInvitationMock: any;
  let routeMock: any;

  beforeEach(() => {
    pendingInvitationMock = {
      saveCode: jasmine.createSpy('saveCode'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PendingInvitation, useValue: pendingInvitationMock },
      ],
    });

    routeMock = {
      queryParamMap: {
        get: jasmine.createSpy('get'),
      },
    };
  });

  it('should save code when present in query params', () => {
    routeMock.queryParamMap.get.and.returnValue('123456');

    const result = TestBed.runInInjectionContext(() =>
      captureInvitationCodeGuard(routeMock as any, {} as any)
    );

    expect(pendingInvitationMock.saveCode).toHaveBeenCalledWith('123456');
    expect(result).toBeTrue();
  });

  it('should not save code when not present in query params', () => {
    routeMock.queryParamMap.get.and.returnValue(null);

    const result = TestBed.runInInjectionContext(() =>
      captureInvitationCodeGuard(routeMock as any, {} as any)
    );

    expect(pendingInvitationMock.saveCode).not.toHaveBeenCalled();
    expect(result).toBeTrue();
  });

  it('should always return true', () => {
    routeMock.queryParamMap.get.and.returnValue('123456');

    const result = TestBed.runInInjectionContext(() =>
      captureInvitationCodeGuard(routeMock as any, {} as any)
    );

    expect(result).toBeTrue();
  });
});
