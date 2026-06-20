import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { Properties } from './properties';

describe('Properties', () => {
  let service: Properties;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
    service = TestBed.inject(Properties);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
