import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Supabase } from '@core/services/supabase/supabase';
import { NetworkStatusService } from '@core/services/network-status/network-status.service';
import { LocalRepository } from '@core/services/sync/local-repository';
import { SyncService } from '@core/services/sync/sync-service';
import { Profile } from '@core/services/profile/profile';
import type { ExchangeRate, CreateExchangeRateData } from '@app-types/exchange-rates-reconciliation';

const ENTITY_TYPE = 'exchange_rate';

@Injectable({ providedIn: 'root' })
export class ExchangeRateService {
  #client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);
  #syncService = inject(SyncService);
  #profile = inject(Profile);

  rates$ = new BehaviorSubject<ExchangeRate[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<unknown>(null);

  /**
   * Fetch exchange rates for a condominium.
   * 
   * Online: queries Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   * 
   * @param condominiumId - The condominium ID
   * @param fromCurrency - Optional source currency filter
   * @param toCurrency - Optional target currency filter
   * @returns Array of ExchangeRate sorted by effective_date (newest first)
   * @throws Error if Supabase query fails
   */
  async fetchByCondominium(
    condominiumId: string,
    fromCurrency?: string,
    toCurrency?: string,
  ): Promise<ExchangeRate[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType(ENTITY_TYPE);
        const rates = entities
          .map((e) => e.data as unknown as ExchangeRate)
          .filter((r) => r.condominium_id === condominiumId)
          .filter((r) => !fromCurrency || r.from_currency === fromCurrency)
          .filter((r) => !toCurrency || r.to_currency === toCurrency)
          .sort((a, b) => b.effective_date.localeCompare(a.effective_date));

        this.rates$.next(rates);
        return rates;
      }

      let query = this.#client
        .from('exchange_rates')
        .select('*')
        .eq('condominium_id', condominiumId)
        .order('effective_date', { ascending: false });

      if (fromCurrency) {
        query = query.eq('from_currency', fromCurrency);
      }
      if (toCurrency) {
        query = query.eq('to_currency', toCurrency);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cache locally
      for (const rate of data || []) {
        await this.#localRepo.upsert(ENTITY_TYPE, rate);
      }

      this.rates$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Get the exchange rate for a specific date.
   * 
   * Returns the most recent rate on or before the specified date.
   * If no rate exists for the date, returns null.
   * 
   * @param condominiumId - The condominium ID
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @param date - The date to get the rate for (YYYY-MM-DD)
   * @returns ExchangeRate if found, null otherwise
   * @throws Error if Supabase query fails
   */
  async getRateForDate(
    condominiumId: string,
    fromCurrency: string,
    toCurrency: string,
    date: string,
  ): Promise<ExchangeRate | null> {
    const { data, error } = await this.#client
      .from('exchange_rates')
      .select('*')
      .eq('condominium_id', condominiumId)
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .lte('effective_date', date)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data;
  }

  /**
   * Create a new exchange rate.
   * 
   * Online: inserts into Supabase and caches locally.
   * Offline: creates local record and queues mutation for sync.
   * 
   * @param data - Exchange rate creation data
   * @returns Created ExchangeRate
   * @throws Error if Supabase insert fails
   */
  async create(data: CreateExchangeRateData): Promise<ExchangeRate> {
    const profileId = this.#getCurrentProfileId();
    const now = new Date().toISOString();

    const rate: ExchangeRate = {
      id: crypto.randomUUID(),
      ...data,
      source: data.source ?? 'manual',
      created_by: profileId,
      created_at: now,
      updated_at: now,
    };

    // Cache locally
    await this.#localRepo.upsert(ENTITY_TYPE, rate);

    if (this.#networkStatus.isOnline()) {
      const { data: result, error } = await this.#client
        .from('exchange_rates')
        .insert({
          condominium_id: data.condominium_id,
          from_currency: data.from_currency,
          to_currency: data.to_currency,
          rate: data.rate,
          effective_date: data.effective_date,
          source: data.source ?? 'manual',
          created_by: profileId,
        })
        .select()
        .single();

      if (error) throw error;

      await this.#localRepo.upsert(ENTITY_TYPE, result);
      this.rates$.next([...this.rates$.value, result]);
      return result;
    }

    // Queue for sync
    await this.#syncService.enqueueMutation(
      'create',
      ENTITY_TYPE,
      rate.id,
      {
        ...data,
        created_by: profileId,
        created_at: now,
        updated_at: now,
      },
      `create-${ENTITY_TYPE}-${rate.id}-${Date.now()}`,
    );

    this.rates$.next([...this.rates$.value, rate]);
    return rate;
  }

  /**
   * Update an existing exchange rate.
   * 
   * Online: updates in Supabase with optimistic local update.
   * Offline: updates local cache and queues mutation for sync.
   * 
   * @param id - The exchange rate ID
   * @param data - Partial exchange rate data to update
   * @throws Error if Supabase update fails
   */
  async update(id: string, data: Partial<CreateExchangeRateData>): Promise<void> {
    const existing = await this.#localRepo.getById(ENTITY_TYPE, id);
    if (!existing) throw new Error('Exchange rate not found');

    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    await this.#localRepo.upsert(ENTITY_TYPE, updated);

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.#client
        .from('exchange_rates')
        .update({
          rate: data.rate,
          effective_date: data.effective_date,
          source: data.source,
          updated_at: updated.updated_at,
        })
        .eq('id', id);

      if (error) throw error;
    } else {
      await this.#syncService.enqueueMutation(
        'update',
        ENTITY_TYPE,
        id,
        data as unknown as Record<string, unknown>,
        `update-${ENTITY_TYPE}-${id}-${Date.now()}`,
      );
    }

    this.rates$.next(this.rates$.value.map((r) => (r.id === id ? updated : r)));
  }

  /**
   * Delete an exchange rate.
   * 
   * Online: deletes from Supabase.
   * Offline: removes from local cache and queues mutation for sync.
   * 
   * @param id - The exchange rate ID
   * @throws Error if Supabase delete fails
   */
  async delete(id: string): Promise<void> {
    await this.#localRepo.delete(ENTITY_TYPE, id);

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.#client
        .from('exchange_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } else {
      await this.#syncService.enqueueMutation(
        'delete',
        ENTITY_TYPE,
        id,
        { id },
        `delete-${ENTITY_TYPE}-${id}-${Date.now()}`,
      );
    }

    this.rates$.next(this.rates$.value.filter((r) => r.id !== id));
  }

  #getCurrentProfileId(): string {
    const profile = this.#profile.profile$.getValue();
    if (!profile) {
      throw new Error('No profile loaded; cannot determine created_by');
    }
    return profile.id;
  }
}
