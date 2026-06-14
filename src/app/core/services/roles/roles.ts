import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import { BehaviorSubject } from 'rxjs';
import { type Role as TRole } from '@app-types/roles';

@Injectable({
  providedIn: 'root',
})
export class Roles {
  // --- Dependencies ---
  private client = inject(Supabase).client;

  // --- Properties ---
  roles$ = new BehaviorSubject<TRole[]>([]);
  loadingRoles$ = new BehaviorSubject<boolean>(false);

  // --- Constructor ---
  constructor() {
    this.fetchRoles();
  }

  // --- Private Methods ---
  private async fetchRoles() {
    try {
      this.loadingRoles$.next(true);
      const { data, error } = await this.client.from('roles').select('*');
      if (error) {
        throw error;
      }
      this.roles$.next(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      this.loadingRoles$.next(false);
    }
  }

  private warnLoadingRoles() {
    if (this.loadingRoles$.getValue()) {
      console.warn('Roles are still loading. Data may not be available yet.');
    }
  }
  // --- Public Methods ---
  getRoleIdByName(roleName: TRole['name']): string | undefined {
    this.warnLoadingRoles();

    const role = this.roles$.getValue().find((r) => r.name === roleName);
    return role?.id;
  }

  getMultipleRoleIdsByNames(roleNames: TRole['name'][]): string[] {
    this.warnLoadingRoles();

    const roleIds = this.roles$
      .getValue()
      .filter((r) => roleNames.includes(r.name))
      .map((r) => r.id);
    return roleIds;
  }

  getRoleNameById(roleId: string): TRole['name'] | undefined {
    this.warnLoadingRoles();

    const role = this.roles$.getValue().find((r) => r.id === roleId);
    return role?.name;
  }
}
