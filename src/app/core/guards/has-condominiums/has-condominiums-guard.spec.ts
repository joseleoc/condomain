import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { hasCondominiumsGuard } from './has-condominiums-guard';
import { Condominium } from '@core/services/condominium/condominium';

describe('hasCondominiumsGuard', () => {
  let condominiumMock: any;
  let routerMock: any;

  beforeEach(() => {
    routerMock = {
      parseUrl: jasmine.createSpy('parseUrl').and.returnValue('/onboarding'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should return true when user has condominiums', (done) => {
    condominiumMock = {
      loadingCondominiums$: new BehaviorSubject<boolean>(false),
      userCondominiums$: new BehaviorSubject<any[]>([{ id: 'condo-1', name: 'Test Condo' }]),
    };

    TestBed.overrideProvider(Condominium, { useValue: condominiumMock });

    TestBed.runInInjectionContext(() => {
      const result = hasCondominiumsGuard({} as any, {} as any);
      
      // Handle both Observable and direct value
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res: any) => {
          expect(res).toBeTrue();
          expect(routerMock.parseUrl).not.toHaveBeenCalled();
          done();
        });
      } else {
        expect(result).toBeTrue();
        done();
      }
    });
  });

  it('should redirect to onboarding when user has no condominiums', (done) => {
    condominiumMock = {
      loadingCondominiums$: new BehaviorSubject<boolean>(false),
      userCondominiums$: new BehaviorSubject<any[]>([]),
    };

    TestBed.overrideProvider(Condominium, { useValue: condominiumMock });

    TestBed.runInInjectionContext(() => {
      const result = hasCondominiumsGuard({} as any, {} as any);
      
      // Handle both Observable and direct value
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res: any) => {
          expect(routerMock.parseUrl).toHaveBeenCalledWith('/onboarding');
          done();
        });
      } else {
        expect(routerMock.parseUrl).toHaveBeenCalledWith('/onboarding');
        done();
      }
    });
  });

  it('should wait for loading to complete', (done) => {
    const loadingSubject = new BehaviorSubject<boolean>(true);
    const condominiumsSubject = new BehaviorSubject<any[]>([{ id: 'condo-1', name: 'Test Condo' }]);
    
    condominiumMock = {
      loadingCondominiums$: loadingSubject,
      userCondominiums$: condominiumsSubject,
    };

    TestBed.overrideProvider(Condominium, { useValue: condominiumMock });

    TestBed.runInInjectionContext(() => {
      const result = hasCondominiumsGuard({} as any, {} as any);
      
      // Set loading to false after a short delay
      setTimeout(() => {
        loadingSubject.next(false);
      }, 100);
      
      // Handle both Observable and direct value
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res: any) => {
          expect(res).toBeTrue();
          done();
        });
      } else {
        expect(result).toBeTrue();
        done();
      }
    });
  });
});
