import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@core/services/auth/auth';
import { filter, map, switchMap, take } from 'rxjs';

export const isNotAuthenticatedGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(Auth);
  const isAuthenticated$ = authService.isAuthenticated$;
  const isLoadingSession$ = authService.isLoadingSession$;


  return isLoadingSession$.pipe(
    filter((isLoading) => !isLoading),
    take(1),
    switchMap(() => isAuthenticated$),
    take(1),
    map((isAuthenticated) => {
      if (!isAuthenticated) {
        return router.parseUrl('/auth/sign-in');
      }

      return true;
    }),
  );
};
