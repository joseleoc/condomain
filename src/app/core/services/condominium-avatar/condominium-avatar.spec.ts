import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { CondominiumAvatar } from './condominium-avatar';

describe('CondominiumAvatar', () => {
  let service: CondominiumAvatar;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
    service = TestBed.inject(CondominiumAvatar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
