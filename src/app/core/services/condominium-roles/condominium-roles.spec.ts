import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { CondominiumRoles } from './condominium-roles';

describe('CondominiumRoles', () => {
  let service: CondominiumRoles;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
    service = TestBed.inject(CondominiumRoles);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
