import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { isNotAuthenticatedGuard } from './is-not-authenticated-guard';
import { CanActivateFn } from '@angular/router';

describe('isNotAuthenticatedGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
      TestBed.runInInjectionContext(() => isNotAuthenticatedGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
