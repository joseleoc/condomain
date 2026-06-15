import { TestBed } from '@angular/core/testing';

import { Wizard } from './wizard';

describe('Wizard', () => {
  let service: Wizard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Wizard);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
