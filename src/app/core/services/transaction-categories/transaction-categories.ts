import { inject, Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import {
  CategoryTreeNode,
  CreateTransactionCategoryData,
  TransactionCategory,
} from '@app-types/transaction-categories';
import { NetworkStatusService } from '../network-status.service';
import { LocalRepository } from '../sync/local-repository';
import { SyncService } from '../sync/sync-service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { TelemetryEvents } from '../telemetry/telemetry.types';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject } from 'rxjs';

export interface UpdateTransactionCategoryData {
  name?: string;
  category_type?: 'income' | 'expense';
  icon?: string | null;
  color?: string | null;
  parent_id?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionCategories {
  // --- Dependencies ---
  private client = inject(Supabase).client;
  #networkStatus = inject(NetworkStatusService);
  #localRepo = inject(LocalRepository);
  #syncService = inject(SyncService);
  #telemetry = inject(TelemetryService);

  // --- State ---
  categories$ = new BehaviorSubject<TransactionCategory[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<unknown>(null);

  // --- Methods ---

  /**
   * Fetch all categories for a condominium.
   * 
   * Online: queries Supabase and caches locally in IndexedDB.
   * Offline: reads from IndexedDB cache filtered by condominium_id.
   * 
   * @param condominiumId - The condominium ID to fetch categories for
   * @returns Array of TransactionCategory sorted by name (ascending)
   * @throws Error if Supabase query fails
   */
  async fetchByCondominium(condominiumId: string): Promise<TransactionCategory[]> {
    this.loading$.next(true);
    this.error$.next(null);

    try {
      if (!this.#networkStatus.isOnline()) {
        const entities = await this.#localRepo.getEntitiesByType('transaction_category');
        const categories = entities
          .map((e) => e.data as unknown as TransactionCategory)
          .filter((c) => c.condominium_id === condominiumId);

        this.categories$.next(categories);
        return categories;
      }

      const { data, error } = await this.client
        .from('transaction_categories')
        .select('*')
        .eq('condominium_id', condominiumId)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) throw error;

      // Cache each category locally
      for (const category of data || []) {
        await this.#localRepo.upsert('transaction_category', category);
      }

      this.categories$.next(data || []);
      return data || [];
    } catch (error) {
      this.error$.next(error);
      throw error;
    } finally {
      this.loading$.next(false);
    }
  }

  /**
   * Fetch categories of a given type and build a tree structure (roots with children).
   * 
   * Online: fetches from Supabase, caches locally, builds tree in memory.
   * Offline: reads from IndexedDB cache, builds tree in memory.
   * 
   * @param condominiumId - The condominium ID
   * @param type - Category type: 'income' or 'expense'
   * @returns Array of CategoryTreeNode (parent categories with children array populated)
   */
  async fetchByType(
    condominiumId: string,
    type: 'income' | 'expense',
  ): Promise<CategoryTreeNode[]> {
    const categories = await this.fetchByCondominium(condominiumId);
    const filtered = categories.filter((c) => c.category_type === type);
    return this.#buildTree(filtered);
  }

  /**
   * Fetch direct children of a parent category.
   * 
   * Online: queries Supabase and caches locally.
   * Offline: reads from IndexedDB cache filtered by parent_id.
   * 
   * @param parentId - The parent category ID
   * @returns Array of child TransactionCategory sorted by name
   * @throws Error if Supabase query fails
   */
  async fetchChildren(parentId: string): Promise<TransactionCategory[]> {
    if (!this.#networkStatus.isOnline()) {
      const entities = await this.#localRepo.getEntitiesByType('transaction_category');
      return entities
        .map((e) => e.data as unknown as TransactionCategory)
        .filter((c) => c.parent_id === parentId);
    }

    const { data, error } = await this.client
      .from('transaction_categories')
      .select('*')
      .eq('parent_id', parentId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) throw error;

    for (const category of data || []) {
      await this.#localRepo.upsert('transaction_category', category);
    }

    return data || [];
  }

  /**
   * Create a new category.
   * 
   * Validates hierarchy (max 2 levels) before creation.
   * Online: inserts into Supabase, caches locally, tracks telemetry.
   * Offline: generates local UUID, creates local record, queues mutation for sync.
   * 
   * @param data - Category creation data (name, category_type, parent_id, icon, color)
   * @returns Created TransactionCategory
   * @throws Error if hierarchy validation fails (3rd level not allowed)
   * @throws Error if Supabase insert fails
   */
  async create(data: CreateTransactionCategoryData): Promise<TransactionCategory> {
    await this.#validateHierarchy(data);

    if (this.#networkStatus.isOnline()) {
      return this.#createOnline(data);
    }
    return this.#createOffline(data);
  }

  /**
   * Update an existing category.
   * 
   * Rejects if category is system-defined (is_system = true).
   * Online: performs optimistic local update, then updates Supabase.
   * Offline: performs optimistic local update, queues mutation for sync.
   * 
   * @param id - The category ID to update
   * @param data - Partial category data to update
   * @throws Error if category is system-defined
   * @throws Error if Supabase update fails (local changes reverted)
   */
  async update(id: string, data: UpdateTransactionCategoryData): Promise<void> {
    // Optimistic local update
    const existing = await this.#localRepo.getById('transaction_category', id);
    const existingCategory = existing
      ? (existing as unknown as TransactionCategory)
      : undefined;
    if (existingCategory?.is_system) {
      throw new Error('System categories cannot be updated');
    }

    if (existing) {
      const updated = {
        ...existing,
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category_type !== undefined && { category_type: data.category_type }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.parent_id !== undefined && { parent_id: data.parent_id }),
        updated_at: new Date().toISOString(),
      };
      await this.#localRepo.upsert('transaction_category', updated);
    }

    if (this.#networkStatus.isOnline()) {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) updateData['name'] = data.name;
      if (data.category_type !== undefined)
        updateData['category_type'] = data.category_type;
      if (data.icon !== undefined) updateData['icon'] = data.icon;
      if (data.color !== undefined) updateData['color'] = data.color;
      if (data.parent_id !== undefined) updateData['parent_id'] = data.parent_id;

      const { error } = await this.client
        .from('transaction_categories')
        .update(updateData)
        .eq('id', id);

      if (error) {
        // Revert optimistic update on failure
        if (existing) {
          await this.#localRepo.upsert('transaction_category', existing);
        }
        throw error;
      }
    } else {
      await this.#syncService.enqueueMutation(
        'update',
        'transaction_category',
        id,
        data as unknown as Record<string, unknown>,
        `update-transaction_category-${id}-${Date.now()}`,
      );
    }
  }

  /**
   * Soft-delete a category.
   * 
   * Rejects if category is system-defined (is_system = true).
   * Online: performs optimistic local update (sets deleted_at), then calls
   *         RPC function soft_delete_category. Reverts if RPC fails.
   * Offline: performs optimistic local update, queues mutation for sync.
   * 
   * @param id - The category ID to delete
   * @throws Error if category is system-defined
   * @throws Error if Supabase RPC fails (local changes reverted)
   */
  async delete(id: string): Promise<void> {
    const existing = await this.#localRepo.getById('transaction_category', id);
    const existingCategory = existing
      ? (existing as unknown as TransactionCategory)
      : undefined;
    if (existingCategory?.is_system) {
      throw new Error('System categories cannot be deleted');
    }

    if (existing) {
      await this.#localRepo.upsert('transaction_category', {
        ...existing,
        deleted_at: new Date().toISOString(),
      });
    }

    if (this.#networkStatus.isOnline()) {
      const { error } = await this.client.rpc('soft_delete_category', {
        p_id: id,
        p_reversal_reason: 'Deleted by user',
      });

      if (error) {
        // Revert optimistic update on failure
        if (existing) {
          await this.#localRepo.upsert('transaction_category', existing);
        }
        throw error;
      }
    } else {
      await this.#syncService.enqueueMutation(
        'delete',
        'transaction_category',
        id,
        { id },
        `delete-transaction_category-${id}-${Date.now()}`,
      );
    }
  }

  // --- Private Methods ---

  /**
   * Validate that a new category does not exceed the 2-level hierarchy.
   * If parent_id is set, the parent must be a root (parent_id IS NULL).
   */
  async #validateHierarchy(data: CreateTransactionCategoryData): Promise<void> {
    if (!data.parent_id) return;

    if (this.#networkStatus.isOnline()) {
      const { data: parent, error } = await this.client
        .from('transaction_categories')
        .select('parent_id, is_system')
        .eq('id', data.parent_id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;

      if (parent && parent['parent_id'] !== null) {
        throw new Error('Categories can only be nested two levels deep');
      }
    } else {
      const cached = await this.#localRepo.getById(
        'transaction_category',
        data.parent_id,
      );
      const parent = cached as TransactionCategory | undefined;
      if (parent && parent.parent_id !== null) {
        throw new Error('Categories can only be nested two levels deep');
      }
    }
  }

  /**
   * Build a tree from a flat list of categories.
   */
  #buildTree(categories: TransactionCategory[]): CategoryTreeNode[] {
    const roots: CategoryTreeNode[] = [];
    const nodeMap = new Map<string, CategoryTreeNode>();

    for (const category of categories) {
      nodeMap.set(category.id, { ...category, children: [] });
    }

    for (const category of categories) {
      const node = nodeMap.get(category.id)!;
      if (category.parent_id === null) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(category.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      }
    }

    return roots;
  }

  async #createOnline(data: CreateTransactionCategoryData): Promise<TransactionCategory> {
    const valuesToInsert = {
      ...data,
      icon: data.icon ?? null,
      color: data.color ?? null,
      is_system: false,
      i18n_key: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await this.client
      .from('transaction_categories')
      .insert(valuesToInsert)
      .select()
      .single();

    if (error) throw error;

    await this.#localRepo.upsert('transaction_category', result);

    this.#telemetry.track(TelemetryEvents.FINANCIAL_CATEGORY_CREATED, {
      category_id: result.id,
      condominium_id: result.condominium_id,
      category_type: result.category_type,
      parent_id: result.parent_id,
    });

    return result;
  }

  async #createOffline(
    data: CreateTransactionCategoryData,
  ): Promise<TransactionCategory & { _local_status: 'pending' }> {
    const id = uuidv4();
    const category: TransactionCategory = {
      id,
      ...data,
      icon: data.icon ?? null,
      color: data.color ?? null,
      is_system: false,
      i18n_key: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    await this.#localRepo.upsert('transaction_category', {
      ...category,
      _local_status: 'pending' as const,
    });

    await this.#syncService.enqueueMutation(
      'create',
      'transaction_category',
      category.id,
      {
        ...data,
        is_system: false,
        i18n_key: null,
        created_at: category.created_at,
        updated_at: category.updated_at,
      },
      `create-transaction_category-${category.id}-${Date.now()}`,
    );

    this.#telemetry.track(TelemetryEvents.FINANCIAL_CATEGORY_CREATED, {
      category_id: category.id,
      condominium_id: category.condominium_id,
      category_type: category.category_type,
      parent_id: category.parent_id,
    });

    return { ...category, _local_status: 'pending' as const };
  }
}
