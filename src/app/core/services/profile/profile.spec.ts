import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { Profile } from './profile';

describe('Profile', () => {
  let service: Profile;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
    service = TestBed.inject(Profile);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
