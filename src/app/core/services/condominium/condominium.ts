import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import {
  type CondominiumWithRole,
  type Condominium as TCondominium,
} from '@app-types/condominium';
import { BehaviorSubject } from 'rxjs';
import { type CreateCondominiumData } from './condominium.types';
import { PaginatedRequest } from '@app-types/general';
import { Profile } from '../profile/profile';
import { Roles } from '../roles/roles';

@Injectable({
  providedIn: 'root',
})
export class Condominium {
  // --- Dependencies ---
  private client = inject(Supabase).client;
  private profileService = inject(Profile);
  private rolesService = inject(Roles);

  // --- Properties ---
  activeCondominium$ = new BehaviorSubject<CondominiumWithRole | null>(null);
  userCondominiums$ = new BehaviorSubject<CondominiumWithRole[]>([]);

  // --- Private Methods ---

  // --- Public Methods ---
  async createCondominium(values: CreateCondominiumData) {
    try {
      const valuesToInsert = {
        ...values,
        currency: values.currency || 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await this.client
        .from('condominiums')
        .insert(valuesToInsert)
        .select()
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      const role_id = this.rolesService.getRoleIdByName('condominium_admin');
      if (!role_id) {
        throw new Error('Owner role not found');
      }

      this.activeCondominium$.next({
        ...data,
        role_id, // Assuming the creator is the owner
      });

      await this.profileService.setActiveCondominium(data.id);

      return data;
    } catch (error) {
      console.error('Error creating condominium:', error);
      throw error;
    }
  }

  async fetchUserCondominiums(
    values: { userId: string } & Partial<PaginatedRequest>,
  ) {
    try {
      const { userId, page = 0, pageSize = 5 } = values;

      const { data, error } = await this.client
        .from('profile_condominiums')
        .select(
          `
          role_id, 
          condominiums(*) 
          `,
        )
        .eq('profile_id', userId)
        .is('deleted_at', null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        throw error;
      }

      const condominiums = data
        .filter((item) => item.condominiums != null)
        .map((item) => {
          const condoData = Array.isArray(item.condominiums)
            ? item.condominiums[0]
            : item.condominiums;

          if (!condoData) return null;
          const condo = condoData as TCondominium;

          return {
            ...condo,
            role_id: item.role_id,
          };
        })
        .filter((item) => item !== null);

      this.userCondominiums$.next(condominiums);
    } catch (error) {
      console.error('Error fetching user condominiums:', error);
      throw error;
    }
  }
}
