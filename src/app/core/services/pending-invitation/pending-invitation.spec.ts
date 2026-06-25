import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { PendingInvitation } from './pending-invitation';

describe('PendingInvitation', () => {
  let service: PendingInvitation;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
    });
    service = TestBed.inject(PendingInvitation);
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveCode', () => {
    it('should save invitation code to localStorage', () => {
      const code = '123456';
      service.saveCode(code);
      expect(localStorage.getItem('pending_invitation_code')).toBe(code);
    });

    it('should overwrite existing code', () => {
      service.saveCode('123456');
      service.saveCode('654321');
      expect(localStorage.getItem('pending_invitation_code')).toBe('654321');
    });
  });

  describe('getCode', () => {
    it('should return saved invitation code', () => {
      const code = '123456';
      localStorage.setItem('pending_invitation_code', code);
      expect(service.getCode()).toBe(code);
    });

    it('should return null when no code is saved', () => {
      expect(service.getCode()).toBeNull();
    });
  });

  describe('clearCode', () => {
    it('should remove invitation code from localStorage', () => {
      localStorage.setItem('pending_invitation_code', '123456');
      service.clearCode();
      expect(localStorage.getItem('pending_invitation_code')).toBeNull();
    });

    it('should not throw error when clearing non-existent code', () => {
      expect(() => service.clearCode()).not.toThrow();
    });
  });
});
