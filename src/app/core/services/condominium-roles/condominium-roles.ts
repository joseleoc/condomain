import { inject, Injectable } from '@angular/core';
import { Condominium } from '../condominium/condominium';
import { Roles } from '../roles/roles';
import { RoleName } from '@app-types/roles';
import { combineLatest, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CondominiumRoles {
  private condominiumService = inject(Condominium);
  private roleService = inject(Roles);

  // --- Reactive observables ---

  /** Emits true once both roles and active condominium are loaded */
  readonly isReady$: Observable<boolean> = combineLatest([
    this.roleService.roles$,
    this.condominiumService.activeCondominium$,
  ]).pipe(map(([roles, condo]) => roles.length > 0 && condo !== null));

  /** Reactive: checks if the active condominium has the specified role */
  checkRole$(roleName: RoleName): Observable<boolean> {
    return combineLatest([
      this.condominiumService.activeCondominium$,
      this.roleService.roles$,
    ]).pipe(
      map(([activeCondominium, roles]) => {
        if (!activeCondominium) return false;
        const roleId = roles.find((r) => r.name === roleName)?.id;
        if (!roleId) return false;
        return activeCondominium.role_id === roleId;
      }),
    );
  }

  /** Reactive: checks if the active condominium has at least one of the specified roles */
  hasAtLeastOneRole$(roleNames: RoleName[]): Observable<boolean> {
    return combineLatest([
      this.condominiumService.activeCondominium$,
      this.roleService.roles$,
    ]).pipe(
      map(([activeCondominium, roles]) => {
        if (!activeCondominium) return false;
        const roleIds = roles
          .filter((r) => roleNames.includes(r.name))
          .map((r) => r.id);
        return roleIds.includes(activeCondominium.role_id);
      }),
    );
  }

  /** Reactive: checks if the active condominium is an admin */
  readonly isAdmin$: Observable<boolean> =
    this.checkRole$('condominium_admin');

  /** Reactive: checks if the active condominium is a resident */
  readonly isResident$: Observable<boolean> =
    this.checkRole$('resident_owner');

  /** Reactive: checks if the active condominium is an operator */
  readonly isOperator$: Observable<boolean> =
    this.checkRole$('admin_operator');

  // --- Synchronous methods (use only when data is guaranteed loaded) ---

  /** Checks if the profile's active condominium has the specified role by name */
  checkRole(roleName: RoleName): boolean {
    const activeCondominium =
      this.condominiumService.activeCondominium$.getValue();

    if (!activeCondominium) {
      console.warn('No active condominium');
      return false;
    }

    const roleId = this.roleService.getRoleIdByName(roleName);
    if (!roleId) {
      console.warn(`Role "${roleName}" not found`);
      return false;
    }

    return activeCondominium.role_id === roleId;
  }

  /** Checks if the profile's active condominium has at least one of the specified roles by name */
  hasAtLeastOneRole(roleNames: RoleName[]): boolean {
    const activeCondominium =
      this.condominiumService.activeCondominium$.getValue();
    if (!activeCondominium) {
      console.warn('No active condominium');
      return false;
    }

    const roleIds = this.roleService.getMultipleRoleIdsByNames(roleNames);

    return roleIds.includes(activeCondominium.role_id);
  }

  /** Checks if the profile's active condominium is an admin */
  isAdmin(): boolean {
    return this.checkRole('condominium_admin');
  }

  /** Checks if the profile's active condominium is a resident */
  isResident(): boolean {
    return this.checkRole('resident_owner');
  }

  /** Checks if the profile's active condominium is an operator */
  isOperator(): boolean {
    return this.checkRole('admin_operator');
  }
}
