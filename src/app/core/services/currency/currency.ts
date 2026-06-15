import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import { BehaviorSubject } from 'rxjs';
import { Currency as TCurrency } from '@app-types/currency';

@Injectable({
  providedIn: 'root',
})
export class Currency {
  // --- Dependencies ---
  private client = inject(Supabase).client;

  // --- Properties ---
  currencies$ = new BehaviorSubject<TCurrency[]>([]);
  loadingCurrencies$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.fetchCurrencies();
  }

  // --- Private Methods ---

  // --- Public Methods ---
  async fetchCurrencies() {
    try {
      this.loadingCurrencies$.next(true);
      const { data, error } = await this.client
        .from('currencies')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }
      this.currencies$.next(data);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      throw error;
    } finally {
      this.loadingCurrencies$.next(false);
    }
  }
}
