import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, switchMap, take } from 'rxjs';
import { Auth } from '@core/services/auth/auth';

export const isAuthenticatedGuard: CanActivateFn = (route, state) => {
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
      if (isAuthenticated) {
        return router.parseUrl('/home');
      }

      return true;
    }),
  );
};
