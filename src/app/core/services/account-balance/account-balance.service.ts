import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Supabase } from '@core/services/supabase/supabase';
import { NetworkStatusService } from '@core/services/network-status/network-status.service';
import { LocalRepository } from '@core/services/sync/local-repository';
import type { AccountMonthlyBalance, AccountAnnualBalance } from '@app-types/account-balances';

const MONTHLY_ENTITY_TYPE = 'account_monthly_balance';
const ANNUAL_ENTITY_TYPE = 'account_annual_balance';

@Injectable({ providedIn: 'root' })
export class AccountBalanceService {
  #client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);

  monthlyBalances$ = new BehaviorSubject<AccountMonthlyBalance[]>([]);
  annualBalances$ = new BehaviorSubject<AccountAnnualBalance[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<unknown>(null);

  /**
   * Fetch monthly balances for a specific account.
   * 
   * Online: queries Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   * 
   * @param accountId - The chart of accounts ID
   * @param year - Optional year filter
   * @returns Array of AccountMonthlyBalance sorted by year/month
   * @throws Error if Supabase query fails
   */
  async fetchMonthlyByAccount(
    accountId: string,
    year?: number,
  ): Promise<AccountMonthlyBalance[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType(MONTHLY_ENTITY_TYPE);
        const balances = entities
          .map((e) => e.data as unknown as AccountMonthlyBalance)
          .filter((b) => b.account_id === accountId)
          .filter((b) => !year || b.year === year)
          .sort((a, b) => a.year - b.year || a.month - b.month);

        this.monthlyBalances$.next(balances);
        return balances;
      }

      let query = this.#client
        .from('account_monthly_balances')
        .select('*')
        .eq('account_id', accountId)
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cache locally
      for (const balance of data || []) {
        await this.#localRepo.upsert(MONTHLY_ENTITY_TYPE, balance);
      }

      this.monthlyBalances$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Fetch annual balances for a specific account.
   * 
   * Online: queries Supabase and caches locally.
   * Offline: reads from IndexedDB cache.
   * 
   * @param accountId - The chart of accounts ID
   * @returns Array of AccountAnnualBalance sorted by year
   * @throws Error if Supabase query fails
   */
  async fetchAnnualByAccount(accountId: string): Promise<AccountAnnualBalance[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType(ANNUAL_ENTITY_TYPE);
        const balances = entities
          .map((e) => e.data as unknown as AccountAnnualBalance)
          .filter((b) => b.account_id === accountId)
          .sort((a, b) => a.year - b.year);

        this.annualBalances$.next(balances);
        return balances;
      }

      const { data, error } = await this.#client
        .from('account_annual_balances')
        .select('*')
        .eq('account_id', accountId)
        .order('year', { ascending: true });

      if (error) throw error;

      // Cache locally
      for (const balance of data || []) {
        await this.#localRepo.upsert(ANNUAL_ENTITY_TYPE, balance);
      }

      this.annualBalances$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Close a fiscal year for an account.
   * 
   * Marks the annual balance as closed (is_closed = true).
   * Once closed, no more modifications are allowed to that year's balances.
   * 
   * @param accountId - The chart of accounts ID
   * @param year - The fiscal year to close
   * @throws Error if Supabase update fails
   * @throws Error if year is already closed
   */
  async closeFiscalYear(accountId: string, year: number): Promise<void> {
    const existing = await this.#localRepo.getById(ANNUAL_ENTITY_TYPE, `${accountId}-${year}`);
    if (!existing) {
      throw new Error(`Annual balance not found for account ${accountId}, year ${year}`);
    }

    const annualBalance = existing as unknown as AccountAnnualBalance;
    if (annualBalance.is_closed) {
      throw new Error(`Fiscal year ${year} is already closed for account ${accountId}`);
    }

    const now = new Date().toISOString();
    const { error } = await this.#client
      .from('account_annual_balances')
      .update({
        is_closed: true,
        closed_at: now,
        updated_at: now,
      })
      .eq('account_id', accountId)
      .eq('year', year);

    if (error) throw error;

    // Update local cache
    await this.#localRepo.upsert(ANNUAL_ENTITY_TYPE, {
      ...annualBalance,
      is_closed: true,
      closed_at: now,
      updated_at: now,
    });

    // Refresh annual balances
    const balances = await this.fetchAnnualByAccount(accountId);
    this.annualBalances$.next(balances);
  }
}
