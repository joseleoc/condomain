import { TestBed } from '@angular/core/testing';

import { CondominiumRoles } from './condominium-roles';

describe('CondominiumRoles', () => {
  let service: CondominiumRoles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CondominiumRoles);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
