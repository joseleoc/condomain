import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import { type Condominium as TCondominium } from '@app-types/condominium';
import { BehaviorSubject } from 'rxjs';
import { CreateCondominiumData } from './condominium.types';

@Injectable({
  providedIn: 'root',
})
export class Condominium {
  // --- Dependencies ---
  private client = inject(Supabase).client;

  // --- Properties ---
  activeCondominium$ = new BehaviorSubject<TCondominium | null>(null);
  userCondominiums$ = new BehaviorSubject<TCondominium[]>([]);

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
      return data;
    } catch (error) {
      console.error('Error creating condominium:', error);
      throw error;
    }
  }
}
