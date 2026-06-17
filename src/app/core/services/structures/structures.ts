import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import { CreateStructureData } from '@app-types/structures';
import { Structure } from '@app-types/structures';

@Injectable({
  providedIn: 'root',
})
export class Structures {
  // --- Dependencies ---
  private client = inject(Supabase).client;

  // --- Methods ---
  async createStructures(values: CreateStructureData[]): Promise<Structure[]> {
    const valuesToInsert = values.map((structure) => ({
      name: structure.name,
      description: structure.description,
      condominium_id: structure.condominium_id,
    }));
    try {
      const { data, error } = await this.client
        .from('structures')
        .insert(valuesToInsert)
        .select();

      if (error) throw error;

      return data || [];
    } catch (error) {
      throw error;
    }
  }
}
