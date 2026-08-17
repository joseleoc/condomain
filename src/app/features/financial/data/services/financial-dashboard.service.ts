import { inject, Injectable, signal, type Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  type Observable,
  combineLatest,
  of,
  from,
} from 'rxjs';
import { map, catchError, switchMap, shareReplay } from 'rxjs/operators';

import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { AccountBalanceService } from '@core/services/account-balance/account-balance.service';
import { ContextService } from '@core/services/context/context.service';
import { NetworkStatusService } from '@core/services/network-status/network-status.service';
import type { CondominiumAccount } from '@app-types/condominium-accounts';

export type ChartDuration = '1m' | '3m' | '6m' | '1y' | '2y';

export interface NetWorthDataPoint {
  /** ISO date string (YYYY-MM-DD) representing the first day of the month. */
  date: string;
  /** Aggregated net worth value for the month. */
  value: number;
  /** Human-readable label for chart axes (e.g., "Jan 2024"). */
  label: string;
}

/**
 * Data orchestrator for the financial dashboard.
 *
 * Coordinates wallet data and monthly balance snapshots to expose reactive
 * streams for net worth, net worth history, loading/error state, and empty state.
 * All data access is offline-first: when offline the underlying domain services
 * fall back to the LocalRepository cache.
 */
@Injectable({ providedIn: 'root' })
export class FinancialDashboardService {
  // --- Dependencies ---
  #accountsService = inject(CondominiumAccounts);
  #balanceService = inject(AccountBalanceService);
  #contextService = inject(ContextService);
  #networkStatus = inject(NetworkStatusService);

  // --- State ---
  #loading = new BehaviorSubject<boolean>(false);
  #error = new BehaviorSubject<unknown>(null);
  #selectedDuration = signal<ChartDuration>('1m');

  // --- Public streams ---
  readonly loading$: Observable<boolean> = this.#loading.asObservable();
  readonly error$: Observable<unknown> = this.#error.asObservable();

  /** Active wallets for the current condominium. */
  readonly wallets$: Observable<CondominiumAccount[]> = combineLatest([
    this.#accountsService.accounts$,
  ]).pipe(
    map(([accounts]) => accounts),
    shareReplay(1),
  );

  /** Sum of all wallet current balances. */
  readonly netWorth$: Observable<number> = combineLatest([this.wallets$]).pipe(
    map(([wallets]) => {
      return wallets.reduce((sum, wallet) => sum + wallet.current_balance, 0);
    }),
    shareReplay(1),
  );

  /** Whether there are no wallets to display. */
  readonly isEmpty$: Observable<boolean> = this.wallets$.pipe(
    map((wallets) => wallets.length === 0),
    shareReplay(1),
  );

  /** Monthly net worth history aggregated across all wallets, filtered by duration. */
  readonly netWorthHistory$: Observable<NetWorthDataPoint[]>;

  /** Currently selected chart duration. */
  readonly selectedDuration: Signal<ChartDuration> =
    this.#selectedDuration.asReadonly();

  constructor() {
    this.netWorthHistory$ = combineLatest([
      this.wallets$,
      toObservable(this.#selectedDuration),
    ]).pipe(
      switchMap(([wallets, duration]) => {
        return this.#calculateHistory(wallets, duration);
      }),
      shareReplay(1),
    );
  }

  /**
   * Loads the wallet list for the active condominium.
   *
   * Sets loading/error state and delegates to CondominiumAccounts.
   * History streams react automatically once wallets are emitted.
   */
  async loadData(): Promise<void> {
    const condominium = this.#contextService.activeCondominium();

    if (!condominium) {
      this.#error.next(new Error('No active condominium'));
      return;
    }

    this.#loading.next(true);
    this.#error.next(null);

    try {
      await this.#accountsService.fetchByCondominium(condominium.id);
    } catch (error) {
      this.#error.next(error);
    } finally {
      this.#loading.next(false);
    }
  }

  /**
   * Deletes a wallet. Delegates to CondominiumAccounts which handles
   * optimistic update and emits the updated list reactively.
   */
  async deleteWallet(id: string): Promise<void> {
    await this.#accountsService.delete(id);
  }

  /**
   * Updates the chart duration filter.
   * Recalculates net worth history reactively.
   */
  setDuration(duration: ChartDuration): void {
    this.#selectedDuration.set(duration);
  }

  // --- Private methods ---

  #calculateHistory(
    wallets: CondominiumAccount[],
    duration: ChartDuration,
  ): Observable<NetWorthDataPoint[]> {
    if (wallets.length === 0) {
      return of([]);
    }

    const isOnline = this.#networkStatus.isOnline();

    return from(this.#fetchAndAggregateHistory(wallets)).pipe(
      map((dataPoints) => {
        if (!isOnline && dataPoints.length === 0) {
          this.#error.next(
            new Error('No cached history data available while offline'),
          );
        }
        return this.#filterByDuration(dataPoints, duration);
      }),
      catchError((error) => {
        this.#error.next(error);
        return of([]);
      }),
    );
  }

  async #fetchAndAggregateHistory(
    wallets: CondominiumAccount[],
  ): Promise<NetWorthDataPoint[]> {
    // Only fetch balances for wallets that have a chart_account_id assigned.
    // account_monthly_balances.account_id references chart_of_accounts(id),
    // NOT condominium_accounts(id).
    const walletsWithChartAccount = wallets.filter(
      (w) => w.chart_account_id != null,
    );

    if (walletsWithChartAccount.length === 0) {
      return [];
    }

    const balancePromises = walletsWithChartAccount.map((wallet) =>
      this.#balanceService.fetchMonthlyByAccount(wallet.chart_account_id!),
    );
    const allBalances = await Promise.all(balancePromises);

    const monthlyTotals = new Map<string, number>();

    for (const balances of allBalances) {
      for (const balance of balances) {
        const key = `${balance.year}-${String(balance.month).padStart(2, '0')}`;
        const current = monthlyTotals.get(key) ?? 0;
        monthlyTotals.set(key, current + balance.closing_balance);
      }
    }

    return Array.from(monthlyTotals.entries())
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        const date = new Date(Number(year), Number(month) - 1, 1);

        return {
          date: this.#formatISODate(date),
          value,
          label: date.toLocaleDateString(undefined, {
            month: 'short',
            year: 'numeric',
          }),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  #filterByDuration(
    dataPoints: NetWorthDataPoint[],
    duration: ChartDuration,
  ): NetWorthDataPoint[] {
    const cutoffDate = this.#getCutoffDate(duration);
    const cutoffStr = this.#formatISODate(cutoffDate);

    return dataPoints.filter((dataPoint) => dataPoint.date >= cutoffStr);
  }

  #getCutoffDate(duration: ChartDuration): Date {
    const now = new Date();
    const cutoff = new Date(now);

    switch (duration) {
      case '1m':
        cutoff.setDate(now.getDate() - 30);
        break;
      case '3m':
        cutoff.setDate(now.getDate() - 90);
        break;
      case '6m':
        cutoff.setDate(now.getDate() - 180);
        break;
      case '1y':
        cutoff.setDate(now.getDate() - 365);
        break;
      case '2y':
        cutoff.setDate(now.getDate() - 730);
        break;
    }

    return cutoff;
  }

  #formatISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
