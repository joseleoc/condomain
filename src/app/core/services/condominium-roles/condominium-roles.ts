import { inject, Injectable } from '@angular/core';
import { Condominium } from '../condominium/condominium';
import { Roles } from '../roles/roles';
import { RoleName } from '@app-types/roles';

@Injectable({
  providedIn: 'root',
})
export class CondominiumRoles {
  private condominiumService = inject(Condominium);
  private roleService = inject(Roles);

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
  isAdmin() {
    return this.checkRole('condominium_admin');
  }

  /** Checks if the profile's active condominium is a resident */
  isResident() {
    return this.checkRole('resident_owner');
  }

  /** Checks if the profile's active condominium is an operator */
  isOperator() {
    return this.checkRole('admin_operator');
  }
}
