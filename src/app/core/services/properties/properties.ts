import { inject, Injectable } from '@angular/core';
import { CreatePropertyData, Property } from '@app-types/property';
import { Supabase } from '../supabase/supabase';
import { NetworkStatusService } from '../network-status.service';
import { LocalRepository } from '../sync/local-repository';
import { SyncService } from '../sync/sync-service';
import { v4 as uuidv4 } from 'uuid';

export interface UpdatePropertyData {
  name?: string;
  share_percentage?: number;
  owner_name?: string | null;
  owner_email?: string | null;
  structure_id?: string;
}

@Injectable({
  providedIn: 'root',
})
export class Properties {
  // --- Dependencies ---
  private client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);
  #syncService = inject(SyncService);

  // --- Methods ---

  /**
   * Fetch properties for a condominium.
   * Online: fetches from Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   */
  async fetchByCondominium(condominiumId: string): Promise<Property[]> {
    if (!this.#networkStatus.isOnline()) {
      const entities = await this.#localRepo.getEntitiesByType('properties');
      return entities
        .map((e) => e.data as unknown as Property)
        .filter((p) => p.condominium_id === condominiumId);
    }

    const { data, error } = await this.client
      .from('properties')
      .select('*')
      .eq('condominium_id', condominiumId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) throw error;

    // Cache each property locally
    for (const property of data || []) {
      await this.#localRepo.upsert('properties', property);
    }

    return data || [];
  }

  /**
   * Fetch properties for a specific structure within a condominium.
   * Online: fetches from Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   */
  async fetchByStructure(structureId: string): Promise<Property[]> {
    if (!this.#networkStatus.isOnline()) {
      const entities = await this.#localRepo.getEntitiesByType('properties');
      return entities
        .map((e) => e.data as unknown as Property)
        .filter((p) => p.structure_id === structureId);
    }

    const { data, error } = await this.client
      .from('properties')
      .select('*')
      .eq('structure_id', structureId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) throw error;

    // Cache each property locally
    for (const property of data || []) {
      await this.#localRepo.upsert('properties', property);
    }

    return data || [];
  }

  /**
   * Fetch a single property by ID.
   * Online: fetches from Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   */
  async getById(id: string): Promise<Property | null> {
    if (!this.#networkStatus.isOnline()) {
      const cached = await this.#localRepo.getById('properties', id);
      return (cached as Property | undefined) ?? null;
    }

    const { data, error } = await this.client
      .from('properties')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    await this.#localRepo.upsert('properties', data);
    return data;
  }

  async createProperties(values: CreatePropertyData[]): Promise<Property[]> {
    if (this.#networkStatus.isOnline()) {
      return this.#createOnline(values);
    }
    return this.#createOffline(values);
  }

  /**
   * Soft-delete a property.
   * Online: calls RPC function to update deleted_at on Supabase.
   * Offline: updates local cache and queues mutation for sync.
   */
  async deleteProperty(id: string): Promise<void> {
    // Optimistic local update
    const existing = await this.#localRepo.getById('properties', id);
    if (existing) {
      await this.#localRepo.upsert('properties', {
        ...existing,
        deleted_at: new Date().toISOString(),
      });
    }

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.client.rpc('soft_delete_property', {
        p_id: id,
        p_reversal_reason: 'Deleted by user',
      });

      if (error) {
        // Revert optimistic update on failure
        if (existing) {
          await this.#localRepo.upsert('properties', existing);
        }
        throw error;
      }
    } else {
      await this.#syncService.enqueueMutation(
        'delete',
        'properties',
        id,
        { id },
        `delete-properties-${id}-${Date.now()}`,
      );
    }
  }

  /**
   * Update a property's fields.
   * Online: updates on Supabase.
   * Offline: updates local cache and queues mutation for sync.
   */
  async updateProperty(id: string, data: UpdatePropertyData): Promise<void> {
    // Optimistic local update
    const existing = await this.#localRepo.getById('properties', id);
    if (existing) {
      const updated = {
        ...existing,
        ...(data.name !== undefined && { name: data.name }),
        ...(data.share_percentage !== undefined && {
          share_percentage: data.share_percentage,
        }),
        ...(data.owner_name !== undefined && { owner_name: data.owner_name }),
        ...(data.owner_email !== undefined && {
          owner_email: data.owner_email,
        }),
        ...(data.structure_id !== undefined && {
          structure_id: data.structure_id,
        }),
        updated_at: new Date().toISOString(),
      };
      await this.#localRepo.upsert('properties', updated);
    }

    if (this.#networkStatus.isOnline()) {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) updateData['name'] = data.name;
      if (data.share_percentage !== undefined)
        updateData['share_percentage'] = data.share_percentage;
      if (data.owner_name !== undefined)
        updateData['owner_name'] = data.owner_name;
      if (data.owner_email !== undefined)
        updateData['owner_email'] = data.owner_email;
      if (data.structure_id !== undefined)
        updateData['structure_id'] = data.structure_id;

      const { error } = await this.client
        .from('properties')
        .update(updateData)
        .eq('id', id);

      if (error) {
        // Revert optimistic update on failure
        if (existing) {
          await this.#localRepo.upsert('properties', existing);
        }
        throw error;
      }
    } else {
      await this.#syncService.enqueueMutation(
        'update',
        'properties',
        id,
        data as unknown as Record<string, unknown>,
        `update-properties-${id}-${Date.now()}`,
      );
    }
  }

  // --- Private Methods ---

  async #createOnline(values: CreatePropertyData[]): Promise<Property[]> {
    const valuesToInsert = values.map((property) => ({
      name: property.name,
      share_percentage: property.share_percentage,
      condominium_id: property.condominium_id,
      structure_id: property.structure_id,
      owner_name: property.owner_name,
      owner_email: property.owner_email,
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await this.client
      .from('properties')
      .insert(valuesToInsert)
      .select();

    if (error) throw error;

    // Cache locally
    for (const property of data || []) {
      await this.#localRepo.upsert('properties', property);
    }

    return data || [];
  }

  async #createOffline(values: CreatePropertyData[]): Promise<Property[]> {
    const tempProperties: Property[] = values.map((v) => {
      const id = uuidv4();
      return {
        id,
        name: v.name,
        share_percentage: v.share_percentage,
        condominium_id: v.condominium_id,
        structure_id: v.structure_id,
        owner_name: v.owner_name ?? null,
        owner_email: v.owner_email ?? null,
        description: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
    });

    // Cache locally immediately
    for (const property of tempProperties) {
      await this.#localRepo.upsert('properties', {
        ...property,
        _local_status: 'pending' as const,
      });
    }

    // Queue each creation for sync
    for (const property of tempProperties) {
      await this.#syncService.enqueueMutation(
        'create',
        'properties',
        property.id,
        {
          name: property.name,
          share_percentage: property.share_percentage,
          condominium_id: property.condominium_id,
          structure_id: property.structure_id,
          owner_name: property.owner_name,
          owner_email: property.owner_email,
          description: null,
          created_at: property.created_at,
          updated_at: property.updated_at,
        },
        `create-properties-${property.id}-${Date.now()}`,
      );
    }

    return tempProperties;
  }
}
