import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';

@Injectable({
  providedIn: 'root',
})
export class Structures {
  // --- Dependencies ---
  private client = inject(Supabase).client;

  // --- Methods ---
  async createStructures() {}
}
