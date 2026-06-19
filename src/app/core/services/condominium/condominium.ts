import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import {
  type CondominiumWithRole,
  type Condominium as TCondominium,
} from '@app-types/condominium';
import { BehaviorSubject } from 'rxjs';
import {
  type CreateCondominiumData,
  type UpdateCondominiumData,
} from './condominium.types';
import { PaginatedRequest } from '@app-types/general';
import { Profile } from '../profile/profile';
import { Roles } from '../roles/roles';
import { Auth } from '../auth/auth';
import { CondominiumAvatar } from '../condominium-avatar/condominium-avatar';

@Injectable({
  providedIn: 'root',
})
export class Condominium {
  // --- Dependencies ---
  private client = inject(Supabase).client;
  private profileService = inject(Profile);
  private rolesService = inject(Roles);
  private authService = inject(Auth);
  private condominiumAvatarService = inject(CondominiumAvatar);

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

  private buildAvatarUrl(filePath: string): string {
    return this.condominiumAvatarService.getAvatarUrl(filePath);
  }

  // --- Public Methods ---
  async createCondominium(
    values: CreateCondominiumData,
  ): Promise<TCondominium> {
    try {
      const valuesToInsert = {
        ...values,
        currency: values.currency || 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        avatar: '',
      };

      if (values.avatar != null) {
        const avatarFilePath = await this.condominiumAvatarService.uploadAvatar(
          values.avatar,
        );
        if (avatarFilePath) valuesToInsert.avatar = avatarFilePath;
      }

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
        role_id,
      });
      this.userCondominiums$.next([
        {
          ...data,
          role_id,
        },
        ...this.userCondominiums$.getValue(),
      ]);

      await this.profileService.setActiveCondominium(data.id);

      return data;
    } catch (error) {
      console.error('Error creating condominium:', error);
      throw error;
    }
  }

  async updateCondominium(
    id: string,
    values: UpdateCondominiumData,
  ): Promise<TCondominium> {
    try {
      const valuesToUpdate: Record<string, unknown> = {
        ...values,
        updated_at: new Date().toISOString(),
      };
      delete valuesToUpdate['avatar'];

      if (values.avatar != null) {
        const avatarFilePath = await this.condominiumAvatarService.uploadAvatar(
          values.avatar,
        );
        if (avatarFilePath) valuesToUpdate['avatar'] = avatarFilePath;
      }

      const { data, error } = await this.client
        .from('condominiums')
        .update(valuesToUpdate)
        .eq('id', id)
        .select()
        .limit(1)
        .single();

      if (error) throw error;

      const currentActive = this.activeCondominium$.getValue();
      if (currentActive?.id === id) {
        this.activeCondominium$.next({ ...currentActive, ...data });
      }

      const currentUserCondos = this.userCondominiums$.getValue();
      this.userCondominiums$.next(
        currentUserCondos.map((c) => (c.id === id ? { ...c, ...data } : c)),
      );

      return data;
    } catch (error) {
      console.error('Error updating condominium:', error);
      throw error;
    }
  }

  async fetchUserCondominiums(values: { profileId: string }) {
    try {
      const { profileId } = values;
      this.loadingCondominiums$.next(true);

      const { data, error } = await this.client
        .from('profile_condominiums')
        .select(
          `
          role_id, 
          condominiums(*)
          `,
        )
        .order('name', { referencedTable: 'condominiums', ascending: true })
        .eq('profile_id', profileId)
        .is('deleted_at', null);

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
        .filter((item) => item !== null)
        .map((item) => {
          if (item && item.avatar) {
            return {
              ...item,
              avatar: this.buildAvatarUrl(item.avatar),
            };
          }
          return item;
        });

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
