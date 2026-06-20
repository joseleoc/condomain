import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { Roles } from './roles';

describe('Roles', () => {
  let service: Roles;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
    service = TestBed.inject(Roles);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
