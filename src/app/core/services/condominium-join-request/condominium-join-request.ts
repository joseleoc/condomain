import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import { Profile } from '../profile/profile';

export interface JoinRequestResult {
  success: boolean;
  error?: 'invalid_code' | 'not_found' | 'already_requested' | 'unknown';
}

@Injectable({
  providedIn: 'root',
})
export class CondominiumJoinRequest {
  // --- Dependencies ---
  private client = inject(Supabase).client;
  private profileService = inject(Profile);

  // --- Public Methods ---
  async submitJoinRequest(invitationCode: string): Promise<JoinRequestResult> {
    try {
      const profileId = this.profileService.profile$.getValue()?.id;
      if (!profileId) {
        return { success: false, error: 'unknown' };
      }

      // Find condominium by invitation code
      const { data: condominium, error: condoError } = await this.client
        .from('condominiums')
        .select('id')
        .eq('invitation_code', invitationCode)
        .is('deleted_at', null)
        .single();

      if (condoError || !condominium) {
        return { success: false, error: 'not_found' };
      }

      // Check if already has a pending request
      const { data: existingRequest } = await this.client
        .from('condominium_join_requests')
        .select('id')
        .eq('condominium_id', condominium.id)
        .eq('profile_id', profileId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        return { success: false, error: 'already_requested' };
      }

      // Create join request
      const { error: insertError } = await this.client
        .from('condominium_join_requests')
        .insert({
          condominium_id: condominium.id,
          profile_id: profileId,
          invitation_code: invitationCode,
          status: 'pending',
        });

      if (insertError) {
        console.error('Error creating join request:', insertError);
        return { success: false, error: 'unknown' };
      }

      return { success: true };
    } catch (err) {
      console.error('Error in submitJoinRequest:', err);
      return { success: false, error: 'unknown' };
    }
  }
}
