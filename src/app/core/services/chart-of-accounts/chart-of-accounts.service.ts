import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Supabase } from '@core/services/supabase/supabase';
import { NetworkStatusService } from '@core/services/network-status.service';
import { LocalRepository } from '@core/services/sync/local-repository';
import { SyncService } from '@core/services/sync/sync-service';
import type { ChartOfAccounts, CreateChartOfAccountsData } from '@app-types/chart-of-accounts';
import { v4 as uuidv4 } from 'uuid';

const ENTITY_TYPE = 'chart_of_accounts';

@Injectable({ providedIn: 'root' })
export class ChartOfAccountsService {
  #client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);
  #syncService = inject(SyncService);

  accounts$ = new BehaviorSubject<ChartOfAccounts[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<unknown>(null);

  async fetchByCondominium(condominiumId: string): Promise<ChartOfAccounts[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType(ENTITY_TYPE);
        const accounts = entities
          .map((e) => e.data as unknown as ChartOfAccounts)
          .filter((a) => a.condominium_id === condominiumId);
        this.accounts$.next(accounts);
        return accounts;
      }

      const { data, error } = await this.#client
        .from(ENTITY_TYPE)
        .select('*')
        .eq('condominium_id', condominiumId)
        .is('deleted_at', null)
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

  async fetchTree(condominiumId: string): Promise<ChartOfAccounts[]> {
    const accounts = await this.fetchByCondominium(condominiumId);
    return this.#buildTree(accounts);
  }

  async create(data: CreateChartOfAccountsData): Promise<ChartOfAccounts> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const account: ChartOfAccounts = {
      id,
      condominium_id: data.condominium_id,
      system_account_id: data.system_account_id ?? null,
      parent_id: data.parent_id ?? null,
      code: data.code,
      name: data.name,
      name_en: data.name_en ?? null,
      type: data.type,
      is_system_defined: data.system_account_id !== null,
      is_active: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await this.#localRepo.upsert(ENTITY_TYPE, account);

    if (this.#networkStatus.isOnline()) {
      const { data: result, error } = await this.#client
        .from(ENTITY_TYPE)
        .insert({
          condominium_id: data.condominium_id,
          system_account_id: data.system_account_id ?? null,
          parent_id: data.parent_id ?? null,
          code: data.code,
          name: data.name,
          name_en: data.name_en ?? null,
          type: data.type,
        })
        .select()
        .single();

      if (error) throw error;

      await this.#localRepo.upsert(ENTITY_TYPE, result);
      this.accounts$.next([...this.accounts$.value, result]);
      return result;
    }

    await this.#syncService.enqueueMutation(
      'create',
      ENTITY_TYPE,
      id,
      data as unknown as Record<string, unknown>,
      `create-${ENTITY_TYPE}-${id}-${Date.now()}`,
    );

    this.accounts$.next([...this.accounts$.value, account]);
    return account;
  }

  async update(id: string, data: Partial<CreateChartOfAccountsData>): Promise<void> {
    const existing = await this.#localRepo.getById(ENTITY_TYPE, id);
    if (!existing) throw new Error('Account not found');

    const account = existing as unknown as ChartOfAccounts;
    if (account.is_system_defined) {
      throw new Error('Cannot modify system-defined accounts');
    }

    const updated = {
      ...account,
      ...data,
      updated_at: new Date().toISOString(),
    };

    await this.#localRepo.upsert(ENTITY_TYPE, updated);

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.#client
        .from(ENTITY_TYPE)
        .update({
          code: data.code,
          name: data.name,
          name_en: data.name_en,
          type: data.type,
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

    this.accounts$.next(this.accounts$.value.map((a) => (a.id === id ? updated : a)));
  }

  async delete(id: string): Promise<void> {
    const existing = await this.#localRepo.getById(ENTITY_TYPE, id);
    if (!existing) throw new Error('Account not found');

    const account = existing as unknown as ChartOfAccounts;
    if (account.is_system_defined) {
      throw new Error('Cannot delete system-defined accounts');
    }

    const deleted = { ...account, deleted_at: new Date().toISOString() };
    await this.#localRepo.upsert(ENTITY_TYPE, deleted);

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.#client
        .from(ENTITY_TYPE)
        .update({ deleted_at: deleted.deleted_at })
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

    this.accounts$.next(this.accounts$.value.filter((a) => a.id !== id));
  }

  #buildTree(accounts: ChartOfAccounts[]): ChartOfAccounts[] {
    const map = new Map<string, ChartOfAccounts & { children: ChartOfAccounts[] }>();
    const roots: (ChartOfAccounts & { children: ChartOfAccounts[] })[] = [];

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
