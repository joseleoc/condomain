import { TestBed } from '@angular/core/testing';

import { Structures } from './structures';

describe('Structures', () => {
  let service: Structures;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Structures);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
