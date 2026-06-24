import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, switchMap, take } from 'rxjs';
import { Condominium } from '@core/services/condominium/condominium';

export const hasCondominiumsGuard: CanActivateFn = () => {
  const router = inject(Router);
  const condominiumService = inject(Condominium);

  return condominiumService.loadingCondominiums$.pipe(
    filter((loading) => !loading),
    take(1),
    map(() => {
      const condominiums = condominiumService.userCondominiums$.getValue();
      if (!condominiums || condominiums.length === 0) {
        return router.parseUrl('/onboarding');
      }
      return true;
    }),
  );
};
