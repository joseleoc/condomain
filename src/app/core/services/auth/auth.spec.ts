import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from './auth';
import { Supabase } from '@core/services/supabase/supabase';
import { TelemetryService } from '@core/services/telemetry';

describe('Auth', () => {
  let service: Auth;
  let mockSupabaseClient: {
    auth: {
      getSession: jasmine.Spy;
      onAuthStateChange: jasmine.Spy;
      signUp: jasmine.Spy;
      signInWithPassword: jasmine.Spy;
      signOut: jasmine.Spy;
    };
  };
  let mockRouter: jasmine.SpyObj<Router>;
  let mockTelemetry: jasmine.SpyObj<TelemetryService>;

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        getSession: jasmine.createSpy('getSession').and.returnValue(
          Promise.resolve({ data: { session: null }, error: null }),
        ),
        onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signUp: jasmine.createSpy('signUp'),
        signInWithPassword: jasmine.createSpy('signInWithPassword'),
        signOut: jasmine.createSpy('signOut'),
      },
    };

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockTelemetry = jasmine.createSpyObj('TelemetryService', [
      'track',
      'identify',
      'reset',
    ]);

    TestBed.configureTestingModule({
      providers: [
        Auth,
        { provide: Supabase, useValue: { client: mockSupabaseClient } },
        { provide: Router, useValue: mockRouter },
        { provide: TelemetryService, useValue: mockTelemetry },
      ],
    });

    service = TestBed.inject(Auth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('signUpWithEmailAndPassword', () => {
    it('should call telemetry identify after successful sign up', fakeAsync(async () => {
      const mockSession = { user: { id: 'user-1', email: 'test@test.com' } };
      mockSupabaseClient.auth.signUp.and.returnValue(
        Promise.resolve({ data: { session: mockSession as any, user: mockSession.user as any }, error: null }),
      );

      await service.signUpWithEmailAndPassword('test@test.com', 'password123');
      tick();

      expect(mockTelemetry.identify).toHaveBeenCalledWith(
        'user-1',
        { email: 'test@test.com', role: '' },
      );

      flush();
    }));

    it('should NOT call telemetry identify on sign up error', fakeAsync(async () => {
      mockSupabaseClient.auth.signUp.and.returnValue(
        Promise.resolve({ data: { session: null, user: null }, error: { message: 'Error', name: 'AuthError' } }),
      );

      try {
        await service.signUpWithEmailAndPassword('test@test.com', 'password123');
      } catch {
        // expected
      }
      tick();

      expect(mockTelemetry.identify).not.toHaveBeenCalled();

      flush();
    }));
  });

  describe('signInWithEmailAndPassword', () => {
    it('should call telemetry identify after successful sign in', fakeAsync(async () => {
      const mockSession = { user: { id: 'user-2', email: 'user@test.com' } };
      mockSupabaseClient.auth.signInWithPassword.and.returnValue(
        Promise.resolve({ data: { session: mockSession as any, user: mockSession.user as any }, error: null }),
      );

      await service.signInWithEmailAndPassword('user@test.com', 'password123');
      tick();

      expect(mockTelemetry.identify).toHaveBeenCalledWith(
        'user-2',
        { email: 'user@test.com', role: '' },
      );

      flush();
    }));

    it('should NOT call telemetry identify on sign in error', fakeAsync(async () => {
      mockSupabaseClient.auth.signInWithPassword.and.returnValue(
        Promise.resolve({ data: { session: null, user: null }, error: { message: 'Error', name: 'AuthError' } }),
      );

      try {
        await service.signInWithEmailAndPassword('user@test.com', 'password123');
      } catch {
        // expected
      }
      tick();

      expect(mockTelemetry.identify).not.toHaveBeenCalled();

      flush();
    }));
  });

  describe('signOut', () => {
    it('should call telemetry reset after successful sign out', fakeAsync(async () => {
      mockSupabaseClient.auth.signOut.and.returnValue(
        Promise.resolve({ error: null }),
      );

      await service.signOut();
      tick();

      expect(mockTelemetry.reset).toHaveBeenCalled();

      flush();
    }));

    it('should NOT call telemetry reset on sign out error', fakeAsync(async () => {
      mockSupabaseClient.auth.signOut.and.returnValue(
        Promise.resolve({ error: { message: 'Error', name: 'AuthError' } }),
      );

      try {
        await service.signOut();
      } catch {
        // expected
      }
      tick();

      expect(mockTelemetry.reset).not.toHaveBeenCalled();

      flush();
    }));
  });
});
