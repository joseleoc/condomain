import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import { Profile } from '../profile/profile';
import { Roles } from '../roles/roles';
import type { JoinRequestWithProfile, JoinRequestStatus } from '@app-types/join-request';
import type { CondominiumInvitationCode } from '@app-types/condominium-invitation-code';

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
  private rolesService = inject(Roles);

  // --- Public Methods ---
  async submitJoinRequest(invitationCode: string): Promise<JoinRequestResult> {
    try {
      const profileId = this.profileService.profile$.getValue()?.id;
      if (!profileId) {
        return { success: false, error: 'unknown' };
      }

      // Find invitation code in condominium_invitation_codes table
      const { data: invitation, error: inviteError } = await this.client
        .from('condominium_invitation_codes')
        .select('id, condominium_id, max_uses, uses_count, expires_at, active')
        .eq('code', invitationCode)
        .is('deleted_at', null)
        .eq('active', true)
        .single();

      if (inviteError || !invitation) {
        return { success: false, error: 'not_found' };
      }

      // Check if invitation has expired
      if (
        invitation.expires_at &&
        new Date(invitation.expires_at) < new Date()
      ) {
        return { success: false, error: 'not_found' };
      }

      // Check if max uses has been reached (null = unlimited)
      if (
        invitation.max_uses !== null &&
        invitation.uses_count >= invitation.max_uses
      ) {
        return { success: false, error: 'not_found' };
      }

      const condominiumId = invitation.condominium_id;

      // Check if already has a pending request
      const { data: existingRequest } = await this.client
        .from('condominium_join_requests')
        .select('id')
        .eq('condominium_id', condominiumId)
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
          condominium_id: condominiumId,
          profile_id: profileId,
          created_by: profileId,
          invitation_id: invitation.id,
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

  // --- Admin Methods ---

  async fetchPendingRequests(
    condominiumId: string,
  ): Promise<JoinRequestWithProfile[]> {
    try {
      const { data, error } = await this.client
        .from('condominium_join_requests')
        .select(
          `
          *,
          profiles:profile_id (id, name, email, avatar)
        `,
        )
        .eq('condominium_id', condominiumId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending requests:', error);
        return [];
      }

      return (data as JoinRequestWithProfile[]) || [];
    } catch (err) {
      console.error('Error in fetchPendingRequests:', err);
      return [];
    }
  }

  async countPendingRequests(condominiumId: string): Promise<number> {
    try {
      const { count, error } = await this.client
        .from('condominium_join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('condominium_id', condominiumId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error counting pending requests:', error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error('Error in countPendingRequests:', err);
      return 0;
    }
  }

  async approveRequest(requestId: string): Promise<boolean> {
    try {
      const profileId = this.profileService.profile$.getValue()?.id;
      if (!profileId) return false;

      // Get the request to know which condominium and profile
      const { data: request, error: fetchError } = await this.client
        .from('condominium_join_requests')
        .select('condominium_id, profile_id, invitation_code')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        console.error('Error fetching request:', fetchError);
        return false;
      }

      // Update request status
      const { error: updateError } = await this.client
        .from('condominium_join_requests')
        .update({
          status: 'approved' as JoinRequestStatus,
          reviewed_by: profileId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error approving request:', updateError);
        return false;
      }

      // Increment uses_count on the invitation code
      const { error: incrementError } = await this.client.rpc(
        'increment_invitation_uses',
        { p_code: request.invitation_code },
      );

      if (incrementError) {
        console.error('Error incrementing invitation uses:', incrementError);
        // Don't fail the approval if increment fails - it's a secondary concern
      }

      // Get the resident_owner role_id
      const roleId = this.rolesService.getRoleIdByName('resident_owner');
      if (!roleId) {
        console.error('resident_owner role not found');
        return false;
      }

      // Add user to condominium as resident_owner
      const { error: insertError } = await this.client
        .from('profile_condominiums')
        .insert({
          profile_id: request.profile_id,
          condominium_id: request.condominium_id,
          role_id: roleId,
        });

      if (insertError) {
        console.error(
          'Error adding profile to condominium after approval:',
          insertError,
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in approveRequest:', err);
      return false;
    }
  }

  async declineRequest(requestId: string): Promise<boolean> {
    try {
      const profileId = this.profileService.profile$.getValue()?.id;
      if (!profileId) return false;

      const { error } = await this.client
        .from('condominium_join_requests')
        .update({
          status: 'declined' as JoinRequestStatus,
          reviewed_by: profileId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error declining request:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in declineRequest:', err);
      return false;
    }
  }

  async getActiveInvitationCode(
    condominiumId: string,
  ): Promise<CondominiumInvitationCode | null> {
    try {
      const { data, error } = await this.client
        .from('condominium_invitation_codes')
        .select('*')
        .eq('condominium_id', condominiumId)
        .eq('active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching invitation code:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error in getActiveInvitationCode:', err);
      return null;
    }
  }
}
