import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { Structures } from './structures';

describe('Structures', () => {
  let service: Structures;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
    service = TestBed.inject(Structures);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
