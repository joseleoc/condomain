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
import { Auth } from '../auth/auth';

@Injectable({
  providedIn: 'root',
})
export class Condominium {
  // --- Dependencies ---
  private client = inject(Supabase).client;
  private profileService = inject(Profile);
  private rolesService = inject(Roles);
  private authService = inject(Auth);

  // --- Properties ---
  loadingCondominiums$ = new BehaviorSubject<boolean>(false);
  activeCondominium$ = new BehaviorSubject<CondominiumWithRole | null>(null);
  userCondominiums$ = new BehaviorSubject<CondominiumWithRole[]>([]);

  // --- Constructor ---
  constructor() {
    this.subscribeToAuthChanges();
  }

  // --- Private Methods ---
  private subscribeToAuthChanges() {
    this.authService.session$.subscribe((session) => {
      if (session) {
        this.fetchUserCondominiums({ profileId: session.user.id });
      } else {
        this.activeCondominium$.next(null);
        this.userCondominiums$.next([]);
      }
    });
  }

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
    values: { profileId: string } & Partial<PaginatedRequest>,
  ) {
    try {
      const { profileId, page = 0, pageSize = 5 } = values;
      this.loadingCondominiums$.next(true);

      const { data, error } = await this.client
        .from('profile_condominiums')
        .select(
          `
          role_id, 
          condominiums(*) 
          `,
        )
        .eq('profile_id', profileId)
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

      // Set active condominium based on profile's active_condominium_id or default to the first one
      const activeCondominiumId =
        this.profileService.profile$.getValue()?.active_condominium_id;
      if (activeCondominiumId != null) {
        const activeCondominium = condominiums.find(
          (c) => c?.id === activeCondominiumId,
        );
        if (activeCondominium) {
          this.activeCondominium$.next(activeCondominium);
        }
      } else {
        this.activeCondominium$.next(condominiums[0] || null);
      }

      this.userCondominiums$.next(condominiums);
    } catch (error) {
      console.error('Error fetching user condominiums:', error);
      throw error;
    } finally {
      this.loadingCondominiums$.next(false);
    }
  }
}
