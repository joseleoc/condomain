import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import { CreateStructureData, Structure } from '@app-types/structures';
import { NetworkStatusService } from '../network-status.service';
import { LocalRepository } from '../sync/local-repository';
import { SyncService } from '../sync/sync-service';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class Structures {
  // --- Dependencies ---
  private client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);
  #syncService = inject(SyncService);

  // --- Methods ---

  /**
   * Fetch structures for a condominium.
   * Online: fetches from Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   */
  async fetchByCondominium(condominiumId: string): Promise<Structure[]> {
    if (!this.#networkStatus.isOnline()) {
      const entities = await this.#localRepo.getEntitiesByType('structures');
      return entities
        .map((e) => e.data as unknown as Structure)
        .filter((s) => s.condominium_id === condominiumId);
    }

    const { data, error } = await this.client
      .from('structures')
      .select('*')
      .eq('condominium_id', condominiumId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) throw error;

    // Cache each structure locally
    for (const structure of data || []) {
      await this.#localRepo.upsert('structures', structure);
    }

    return data || [];
  }

  /**
   * Fetch a single structure by ID.
   * Online: fetches from Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   */
  async getById(id: string): Promise<Structure | null> {
    if (!this.#networkStatus.isOnline()) {
      const cached = await this.#localRepo.getById('structures', id);
      return (cached as Structure | undefined) ?? null;
    }

    const { data, error } = await this.client
      .from('structures')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    await this.#localRepo.upsert('structures', data);
    return data;
  }

  async createStructures(values: CreateStructureData[]): Promise<Structure[]> {
    if (this.#networkStatus.isOnline()) {
      return this.#createOnline(values);
    }
    return this.#createOffline(values);
  }

  /**
   * Soft-delete a structure.
   * Online: updates deleted_at on Supabase.
   * Offline: updates local cache and queues mutation for sync.
   */
  async deleteStructure(id: string): Promise<void> {
    // Optimistic local update
    const existing = await this.#localRepo.getById('structures', id);
    if (existing) {
      await this.#localRepo.upsert('structures', {
        ...existing,
        deleted_at: new Date().toISOString(),
      });
    }

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.client
        .from('structures')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        // Revert optimistic update on failure
        if (existing) {
          await this.#localRepo.upsert('structures', existing);
        }
        throw error;
      }
    } else {
      await this.#syncService.enqueueMutation(
        'delete',
        'structures',
        id,
        { id },
        `delete-structures-${id}-${Date.now()}`,
      );
    }
  }

  // --- Private Methods ---

  async #createOnline(values: CreateStructureData[]): Promise<Structure[]> {
    const valuesToInsert = values.map((structure) => ({
      name: structure.name,
      description: structure.description,
      condominium_id: structure.condominium_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await this.client
      .from('structures')
      .insert(valuesToInsert)
      .select();

    if (error) throw error;

    // Cache locally
    for (const structure of data || []) {
      await this.#localRepo.upsert('structures', structure);
    }

    return data || [];
  }

  async #createOffline(values: CreateStructureData[]): Promise<Structure[]> {
    const tempStructures: Structure[] = values.map((v) => {
      const id = uuidv4();
      return {
        id,
        name: v.name,
        description: v.description ?? null,
        condominium_id: v.condominium_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
    });

    // Cache locally immediately
    for (const structure of tempStructures) {
      await this.#localRepo.upsert('structures', {
        ...structure,
        _local_status: 'pending' as const,
      });
    }

    // Queue each creation for sync
    for (const structure of tempStructures) {
      await this.#syncService.enqueueMutation(
        'create',
        'structures',
        structure.id,
        {
          name: structure.name,
          description: structure.description,
          condominium_id: structure.condominium_id,
          created_at: structure.created_at,
          updated_at: structure.updated_at,
        },
        `create-structures-${structure.id}-${Date.now()}`,
      );
    }

    return tempStructures;
  }
}
