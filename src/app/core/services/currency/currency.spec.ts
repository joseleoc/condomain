import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { Currency } from './currency';

describe('Currency', () => {
  let service: Currency;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
    service = TestBed.inject(Currency);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
