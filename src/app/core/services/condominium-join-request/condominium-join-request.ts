import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import { Profile } from '../profile/profile';
import { Roles } from '../roles/roles';
import { NetworkStatusService } from '../network-status.service';
import { LocalRepository } from '../sync/local-repository';
import { SyncService } from '../sync/sync-service';
import { BehaviorSubject } from 'rxjs';
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
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);
  #syncService = inject(SyncService);

  // --- Reactive State ---
  private _pendingRequests$ = new BehaviorSubject<JoinRequestWithProfile[]>([]);
  private _pendingRequestsCount$ = new BehaviorSubject<number>(0);
  private _currentCondominiumId: string | null = null;

  // --- Public Observables ---
  readonly pendingRequests$ = this._pendingRequests$.asObservable();
  readonly pendingRequestsCount$ = this._pendingRequestsCount$.asObservable();

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
      const { data: newRequest, error: insertError } = await this.client
        .from('condominium_join_requests')
        .insert({
          condominium_id: condominiumId,
          profile_id: profileId,
          created_by: profileId,
          invitation_id: invitation.id,
          status: 'pending',
        })
        .select(`
          *,
          profiles:profile_id (id, name, email, avatar)
        `)
        .single();

      if (insertError || !newRequest) {
        console.error('Error creating join request:', insertError);
        return { success: false, error: 'unknown' };
      }

      // Cache locally
      await this.#localRepo.upsert('join_requests', newRequest as unknown as Record<string, unknown>);

      // Update reactive state if this is for the current condominium
      if (this._currentCondominiumId === condominiumId) {
        const currentRequests = this._pendingRequests$.getValue();
        this._pendingRequests$.next([newRequest as JoinRequestWithProfile, ...currentRequests]);
        this._pendingRequestsCount$.next(currentRequests.length + 1);
      }

      return { success: true };
    } catch (err) {
      console.error('Error in submitJoinRequest:', err);
      return { success: false, error: 'unknown' };
    }
  }

  // --- Admin Methods ---

  /**
   * Load pending requests for a condominium and update reactive state.
   * Online: fetches from Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   */
  async loadPendingRequests(condominiumId: string): Promise<void> {
    this._currentCondominiumId = condominiumId;

    if (!this.#networkStatus.isOnline()) {
      const entities = await this.#localRepo.getEntitiesByType('join_requests');
      const requests = entities
        .map((e) => e.data as unknown as JoinRequestWithProfile)
        .filter((r) => r.condominium_id === condominiumId && r.status === 'pending');
      
      this._pendingRequests$.next(requests);
      this._pendingRequestsCount$.next(requests.length);
      return;
    }

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
      return;
    }

    const requests = (data as JoinRequestWithProfile[]) || [];
    
    // Cache locally
    for (const request of requests) {
      await this.#localRepo.upsert('join_requests', request as unknown as Record<string, unknown>);
    }

    // Update reactive state
    this._pendingRequests$.next(requests);
    this._pendingRequestsCount$.next(requests.length);
  }

  /**
   * Get current pending requests count (synchronous).
   */
  getPendingRequestsCount(): number {
    return this._pendingRequestsCount$.getValue();
  }

  /**
   * Get current pending requests (synchronous).
   */
  getPendingRequests(): JoinRequestWithProfile[] {
    return this._pendingRequests$.getValue();
  }

  async fetchPendingRequests(
    condominiumId: string,
  ): Promise<JoinRequestWithProfile[]> {
    await this.loadPendingRequests(condominiumId);
    return this._pendingRequests$.getValue();
  }

  async countPendingRequests(condominiumId: string): Promise<number> {
    await this.loadPendingRequests(condominiumId);
    return this._pendingRequestsCount$.getValue();
  }

  async approveRequest(requestId: string): Promise<boolean> {
    try {
      const profileId = this.profileService.profile$.getValue()?.id;
      if (!profileId) return false;

      // Get the request with invitation code
      const { data: request, error: fetchError } = await this.client
        .from('condominium_join_requests')
        .select(`
          condominium_id,
          profile_id,
          invitation_id,
          condominium_invitation_codes!inner(code)
        `)
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
      const invitationCode = (request as any).condominium_invitation_codes?.code;
      if (invitationCode) {
        const { error: incrementError } = await this.client.rpc(
          'increment_invitation_uses',
          { p_code: invitationCode },
        );

        if (incrementError) {
          console.error('Error incrementing invitation uses:', incrementError);
          // Don't fail the approval if increment fails - it's a secondary concern
        }
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

      // Update local state - remove from pending requests
      const currentRequests = this._pendingRequests$.getValue();
      const updatedRequests = currentRequests.filter((r) => r.id !== requestId);
      this._pendingRequests$.next(updatedRequests);
      this._pendingRequestsCount$.next(updatedRequests.length);

      // Update local cache
      const existingRequest = await this.#localRepo.getById('join_requests', requestId);
      if (existingRequest) {
        await this.#localRepo.upsert('join_requests', {
          ...existingRequest,
          status: 'approved',
          reviewed_by: profileId,
          reviewed_at: new Date().toISOString(),
        } as Record<string, unknown>);
      }

      return true;
    } catch (err) {
      console.error('Error in approveRequest:', err);
      return false;
    }
  }

  async approveRequestWithProperty(
    requestId: string,
    propertyId: string,
  ): Promise<boolean> {
    try {
      const profileId = this.profileService.profile$.getValue()?.id;
      if (!profileId) return false;

      // Get the request with invitation code
      const { data: request, error: fetchError } = await this.client
        .from('condominium_join_requests')
        .select(`
          condominium_id,
          profile_id,
          invitation_id,
          condominium_invitation_codes!inner(code)
        `)
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
      const invitationCode = (request as any).condominium_invitation_codes?.code;
      if (invitationCode) {
        const { error: incrementError } = await this.client.rpc(
          'increment_invitation_uses',
          { p_code: invitationCode }
        );

        if (incrementError) {
          console.error('Error incrementing invitation uses:', incrementError);
          // Don't fail the approval if increment fails - it's a secondary concern
        }
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
          property_id: propertyId,
        });

      if (insertError) {
        console.error('Error adding profile to condominium after approval:', insertError);
        return false;
      }

      // Update local state - remove from pending requests
      const currentRequests = this._pendingRequests$.getValue();
      const updatedRequests = currentRequests.filter((r) => r.id !== requestId);
      this._pendingRequests$.next(updatedRequests);
      this._pendingRequestsCount$.next(updatedRequests.length);

      // Update local cache
      const existingRequest = await this.#localRepo.getById('join_requests', requestId);
      if (existingRequest) {
        await this.#localRepo.upsert('join_requests', {
          ...existingRequest,
          status: 'approved',
          reviewed_by: profileId,
          reviewed_at: new Date().toISOString(),
        } as Record<string, unknown>);
      }

      return true;
    } catch (err) {
      console.error('Error in approveRequestWithProperty:', err);
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

      // Update local state - remove from pending requests
      const currentRequests = this._pendingRequests$.getValue();
      const updatedRequests = currentRequests.filter((r) => r.id !== requestId);
      this._pendingRequests$.next(updatedRequests);
      this._pendingRequestsCount$.next(updatedRequests.length);

      // Update local cache
      const existingRequest = await this.#localRepo.getById('join_requests', requestId);
      if (existingRequest) {
        await this.#localRepo.upsert('join_requests', {
          ...existingRequest,
          status: 'declined',
          reviewed_by: profileId,
          reviewed_at: new Date().toISOString(),
        } as Record<string, unknown>);
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
