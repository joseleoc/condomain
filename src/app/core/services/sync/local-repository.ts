import { Injectable } from '@angular/core';
import { getLocalDB, type LocalDBSchema } from './local-db';

@Injectable({ providedIn: 'root' })
export class LocalRepository {
  /**
   * Enqueue a mutation to the outbox for deferred dispatch.
   * Returns the auto-incremented ID of the new outbox entry.
   */
  async enqueueMutation(
    mutation: Omit<LocalDBSchema['outbox']['value'], 'id' | 'created_at'>,
  ): Promise<number> {
    const db = await getLocalDB();
    // id is auto-incremented by IndexedDB; created_at is set here.
    // Type assertion needed because idb's add expects the full value type.
    return db.add('outbox', {
      ...mutation,
      created_at: new Date().toISOString(),
    } as LocalDBSchema['outbox']['value']);
  }

  /**
   * Get all pending mutations from the outbox in FIFO order (by created_at).
   */
  async getPendingMutations(): Promise<LocalDBSchema['outbox']['value'][]> {
    const db = await getLocalDB();
    const tx = db.transaction('outbox', 'readonly');
    const index = tx.store.index('by_created_at');
    return index.getAll();
  }

  /**
   * Delete a mutation from the outbox by its ID.
   * Called after successful dispatch to the server.
   */
  async deleteMutation(id: number): Promise<void> {
    const db = await getLocalDB();
    await db.delete('outbox', id);
  }

  /**
   * Update retry metadata on a failed mutation.
   */
  async updateMutationRetry(
    id: number,
    retryCount: number,
    error: string | null,
  ): Promise<void> {
    const db = await getLocalDB();
    const tx = db.transaction('outbox', 'readwrite');
    const existing = await tx.store.get(id);
    if (existing) {
      existing.retry_count = retryCount;
      existing.last_error = error;
      await tx.store.put(existing);
    }
  }

  /**
   * Get the last sync timestamp for a given entity-condominium key.
   * Returns undefined if no sync has been recorded.
   */
  async getLastSyncAt(key: string): Promise<string | undefined> {
    const db = await getLocalDB();
    const state = await db.get('sync_state', key);
    return state?.last_sync_at;
  }

  /**
   * Store the last sync timestamp for a given entity-condominium key.
   */
  async setLastSyncAt(key: string, timestamp: string): Promise<void> {
    const db = await getLocalDB();
    await db.put('sync_state', {
      key,
      last_sync_at: timestamp,
      sync_status: 'idle',
    });
  }
}
