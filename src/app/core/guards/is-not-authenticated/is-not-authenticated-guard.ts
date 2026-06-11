import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@core/services/auth/auth';
import { map, take } from 'rxjs';

export const isNotAuthenticatedGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(Auth).isAuthenticated$;

  return authService.pipe(
    take(1),
    map((isAuthenticated) => {
      if (!isAuthenticated) {
        return router.parseUrl('/auth/sign-in');
      }

      return true;
    }),
  );
};
