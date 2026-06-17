import { inject, Injectable } from '@angular/core';
import { CreatePropertyData } from '@app-types/property';
import { Supabase } from '../supabase/supabase';
import { Property } from '@app-types/property';

@Injectable({
  providedIn: 'root',
})
export class Properties {
  // --- Dependencies ---
  private client = inject(Supabase).client;

  // --- Methods ---
  async createProperties(values: CreatePropertyData[]): Promise<Property[]> {
    try {
      const valuesToInsert = values.map((property) => ({
        name: property.name,
        share_percentage: property.share_percentage,
        condominium_id: property.condominium_id,
        structure_id: property.structure_id,
      }));
      const { error, data } = await this.client
        .from('properties')
        .insert(valuesToInsert)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  }
}
