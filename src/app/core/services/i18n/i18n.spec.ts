import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { I18n } from './i18n';

describe('I18n', () => {
  let service: I18n;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
    service = TestBed.inject(I18n);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
