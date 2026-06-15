import { TestBed } from '@angular/core/testing';

import { Condominium } from './condominium';

describe('Condominium', () => {
  let service: Condominium;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Condominium);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
