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
  // --- Public Methods ---
  getRoleIdByName(roleName: TRole['name']): string | undefined {
    const role = this.roles$.getValue().find((r) => r.name === roleName);
    return role?.id;
  }
}
