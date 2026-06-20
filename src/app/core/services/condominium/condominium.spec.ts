import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { Condominium } from './condominium';

describe('Condominium', () => {
  let service: Condominium;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
    service = TestBed.inject(Condominium);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
