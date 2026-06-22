import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { ContextService } from './context.service';
import { Condominium } from '@core/services/condominium/condominium';
import { CondominiumRoles } from '@core/services/condominium-roles/condominium-roles';
import { Profile } from '@core/services/profile/profile';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';

describe('ContextService', () => {
  let service: ContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
      providers: [
        {
          provide: Condominium,
          useValue: {
            activeCondominium$: new BehaviorSubject(null),
            userCondominiums$: new BehaviorSubject([]),
            loadingCondominiums$: new BehaviorSubject(false),
            fetchUserCondominiums: jasmine.createSpy('fetchUserCondominiums').and.returnValue(Promise.resolve()),
          },
        },
        {
          provide: CondominiumRoles,
          useValue: {
            isAdmin: jasmine.createSpy('isAdmin').and.returnValue(false),
            isOperator: jasmine.createSpy('isOperator').and.returnValue(false),
            isResident: jasmine.createSpy('isResident').and.returnValue(false),
            checkRole: jasmine.createSpy('checkRole').and.returnValue(false),
          },
        },
        {
          provide: Profile,
          useValue: {
            profile$: new BehaviorSubject(null),
            setActiveCondominium: jasmine.createSpy('setActiveCondominium').and.returnValue(Promise.resolve()),
          },
        },
        { provide: QueryClient, useValue: new QueryClient() },
      ],
    });
    service = TestBed.inject(ContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose activeCondominium signal', () => {
    expect(service.activeCondominium).toBeDefined();
    expect(typeof service.activeCondominium).toBe('function');
  });

  it('should expose isAdmin signal', () => {
    expect(service.isAdmin).toBeDefined();
    expect(typeof service.isAdmin).toBe('function');
  });

  it('should expose roleName signal', () => {
    expect(service.roleName).toBeDefined();
    expect(typeof service.roleName).toBe('function');
  });

  it('should expose isLoading signal', () => {
    expect(service.isLoading).toBeDefined();
    expect(typeof service.isLoading).toBe('function');
  });

  it('should expose userCondominiums signal', () => {
    expect(service.userCondominiums).toBeDefined();
    expect(typeof service.userCondominiums).toBe('function');
  });

  describe('getActiveContext', () => {
    it('should return context object with all fields', () => {
      const context = service.getActiveContext();
      expect(context).toEqual({
        condominium: null,
        roleName: null,
        isAdmin: false,
        isLoading: false,
      });
    });
  });
});
