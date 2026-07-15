import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Supabase } from '@core/services/supabase/supabase';
import { NetworkStatusService } from '@core/services/network-status/network-status.service';
import { LocalRepository } from '@core/services/sync/local-repository';
import type { ChartOfAccountsSystem } from '@app-types/chart-of-accounts-system';

const ENTITY_TYPE = 'chart_of_accounts_system';

@Injectable({ providedIn: 'root' })
export class ChartOfAccountsSystemService {
  #client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);

  accounts$ = new BehaviorSubject<ChartOfAccountsSystem[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<unknown>(null);

  async fetchAll(): Promise<ChartOfAccountsSystem[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType(ENTITY_TYPE);
        const accounts = entities.map((e) => e.data as unknown as ChartOfAccountsSystem);
        this.accounts$.next(accounts);
        return accounts;
      }

      const { data, error } = await this.#client
        .from(ENTITY_TYPE)
        .select('*')
        .eq('is_active', true)
        .order('code', { ascending: true });

      if (error) throw error;

      this.accounts$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  async fetchTree(): Promise<ChartOfAccountsSystem[]> {
    const accounts = await this.fetchAll();
    return this.#buildTree(accounts);
  }

  #buildTree(accounts: ChartOfAccountsSystem[]): ChartOfAccountsSystem[] {
    const map = new Map<string, ChartOfAccountsSystem & { children: ChartOfAccountsSystem[] }>();
    const roots: (ChartOfAccountsSystem & { children: ChartOfAccountsSystem[] })[] = [];

    accounts.forEach((acc) => {
      map.set(acc.id, { ...acc, children: [] });
    });

    accounts.forEach((acc) => {
      const node = map.get(acc.id)!;
      if (acc.parent_id && map.has(acc.parent_id)) {
        map.get(acc.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
