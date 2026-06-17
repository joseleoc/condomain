import { TestBed } from '@angular/core/testing';

import { CondominiumAvatar } from './condominium-avatar';

describe('CondominiumAvatar', () => {
  let service: CondominiumAvatar;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CondominiumAvatar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
