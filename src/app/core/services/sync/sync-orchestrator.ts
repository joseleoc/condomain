import { inject, Injectable } from '@angular/core';
import { LocalRepository } from './local-repository';
import { ConflictResolver } from './conflict-resolver';
import { Supabase } from '@core/services/supabase/supabase';
import { QueryClient } from '@tanstack/angular-query-experimental';

@Injectable({ providedIn: 'root' })
export class SyncOrchestrator {
  #localRepo = inject(LocalRepository);
  #conflictResolver = inject(ConflictResolver);
  #supabase = inject(Supabase);
  #queryClient = inject(QueryClient);

  /**
   * Full bidirectional sync for a specific entity type and condominium.
   * Fetches server delta, resolves conflicts, applies to local DB, and invalidates queries.
   */
  async sync(
    entityType: string,
    condominiumId: string,
  ): Promise<{ synced: number; conflicts: number }> {
    const syncKey = `${entityType}:${condominiumId}`;
    const lastSyncAt = await this.#localRepo.getLastSyncAt(syncKey);
    const since = lastSyncAt ?? '1970-01-01T00:00:00Z';

    let conflicts = 0;

    // Step 1: Fetch server delta
    const rpcName = `get_${entityType}_delta`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcResult: { data: any; error: any } = await this.#supabase.client.rpc(
      rpcName,
      {
        p_condominium_id: condominiumId,
        p_since: since,
      },
    );

    if (rpcResult.error) {
      throw new Error(`Sync failed: ${rpcResult.error.message}`);
    }

    const serverDelta = rpcResult.data;

    // Step 2: Apply server changes to local DB
    if (serverDelta && serverDelta.length > 0) {
      for (const serverRow of serverDelta) {
        const localRow = await this.#localRepo.getById(entityType, serverRow.id);

        if (localRow && localRow['version'] !== serverRow['version']) {
          // Conflict detected — version mismatch
          const resolution = this.#conflictResolver.resolve(
            entityType,
            serverRow.id,
            localRow['version'] as number,
            serverRow['version'] as number,
            localRow,
            serverRow,
          );

          if (resolution.resolution === 'server_wins') {
            await this.#localRepo.upsert(entityType, {
              ...serverRow,
              _local_status: 'synced',
            });
            conflicts++;
          } else {
            // manual_required — still apply server data for safety
            await this.#localRepo.upsert(entityType, {
              ...serverRow,
              _local_status: 'conflict',
            });
            conflicts++;
          }
        } else {
          // No conflict — apply server change normally
          await this.#localRepo.upsert(entityType, {
            ...serverRow,
            _local_status: 'synced',
          });
        }
      }
    }

    // Step 3: Update sync timestamp
    await this.#localRepo.setLastSyncAt(syncKey, new Date().toISOString());

    // Step 4: Invalidate TanStack Query cache
    this.#queryClient.invalidateQueries({
      queryKey: [entityType, condominiumId],
    });

    return {
      synced: serverDelta?.length ?? 0,
      conflicts,
    };
  }
}
