import { inject, Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Condominium } from '@core/services/condominium/condominium';
import { CondominiumRoles } from '@core/services/condominium-roles/condominium-roles';
import { Profile } from '@core/services/profile/profile';
import { QueryClient } from '@tanstack/angular-query-experimental';
import type { CondominiumWithRole } from '@app-types/condominium';
import type { RoleName } from '@app-types/roles';
import { combineLatest, map } from 'rxjs';

export interface ActiveContext {
  condominium: CondominiumWithRole | null;
  roleName: RoleName | null;
  isAdmin: boolean;
  isLoading: boolean;
}

/**
 * Centralizes the "active context" — which condominium the user is operating on
 * and what role they have in it. Exposes reactive Signals for UI consumption.
 *
 * Changing context invalidates all TanStack Query caches scoped to the previous
 * condominium, forcing a fresh fetch (or cache read) for the new tenant.
 */
@Injectable({ providedIn: 'root' })
export class ContextService {
  #condominiumService = inject(Condominium);
  #condominiumRoles = inject(CondominiumRoles);
  #profileService = inject(Profile);
  #queryClient = inject(QueryClient);

  // --- Reactive signals ---

  /** The currently active condominium with role info */
  readonly activeCondominium: Signal<CondominiumWithRole | null> = toSignal(
    this.#condominiumService.activeCondominium$,
    { initialValue: null },
  );

  /** Whether the user is an admin in the active condominium */
  readonly isAdmin: Signal<boolean> = toSignal(
    this.#condominiumRoles.isAdmin$,
    { initialValue: false },
  );

  /** The role name of the user in the active condominium */
  readonly roleName: Signal<RoleName | null> = toSignal(
    combineLatest([
      this.#condominiumRoles.isAdmin$,
      this.#condominiumRoles.isOperator$,
      this.#condominiumRoles.isResident$,
    ]).pipe(
      map(([isAdmin, isOperator, isResident]) =>
        isAdmin
          ? 'condominium_admin'
          : isOperator
            ? 'admin_operator'
            : isResident
              ? 'resident_owner'
              : null,
      ),
    ),
    { initialValue: null },
  );

  /** Whether the condominium list is still loading */
  readonly isLoading: Signal<boolean> = toSignal(
    this.#condominiumService.loadingCondominiums$,
    { initialValue: false },
  );

  /** All condominiums the user belongs to */
  readonly userCondominiums = toSignal(
    this.#condominiumService.userCondominiums$,
    { initialValue: [] as CondominiumWithRole[] },
  );

  /**
   * Switch the active condominium context.
   * Updates the profile's active_condominium_id, updates local state,
   * and invalidates all TanStack Query caches scoped to condominium data.
   */
  async setActiveCondominium(condominiumId: string): Promise<void> {
    await this.#profileService.setActiveCondominium(condominiumId);
    await this.#condominiumService.fetchUserCondominiums({
      profileId: this.#profileService.profile$.getValue()?.id ?? '',
    });

    // Invalidate all condominium-scoped queries to force refetch
    this.#queryClient.invalidateQueries({
      queryKey: ['structures'],
    });
    this.#queryClient.invalidateQueries({
      queryKey: ['properties'],
    });
  }

  /**
   * Get the full active context as a single object.
   * Useful for components that need all context values at once.
   */
  getActiveContext(): ActiveContext {
    return {
      condominium: this.activeCondominium(),
      roleName: this.roleName(),
      isAdmin: this.isAdmin(),
      isLoading: this.isLoading(),
    };
  }
}
