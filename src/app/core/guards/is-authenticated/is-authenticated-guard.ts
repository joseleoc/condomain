import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { Auth } from '@core/services/auth/auth';

export const isAuthenticatedGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(Auth).isAuthenticated$;

  return authService.pipe(
    take(1),
    map((isAuthenticated) => {
      if (isAuthenticated) {
        return router.parseUrl('/home');
      }

      return true;
    }),
  );
};
