import { inject, Injectable } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { NetworkStatusService } from './network-status.service';
import { Condominium } from './condominium/condominium';
import { LocalRepository } from './sync/local-repository';
import type { CondominiumWithRole } from '@app-types/condominium';

/**
 * Proof-of-concept service demonstrating how to use TanStack Query
 * with offline-first infrastructure for condominium data.
 *
 * This service coexists alongside the existing Condominium service.
 * It does NOT replace it — it demonstrates the pattern for future migration.
 *
 * Usage:
 *   In a component:
 *   condoQuery = this.condoQueryService.getCondominiums(userId);
 *   condominiums = toSignal(this.condoQuery.data$, { initialValue: [] });
 */
@Injectable({ providedIn: 'root' })
export class CondominiumQueryService {
  #networkStatus = inject(NetworkStatusService);
  #condominiumService = inject(Condominium);
  #localRepo = inject(LocalRepository);
  #queryClient = inject(QueryClient);

  /**
   * Create a TanStack Query for fetching user condominiums.
   * - Online: fetches from Supabase via existing Condominium service
   * - Offline: reads from IndexedDB cache via LocalRepository
   *
   * @param userId The profile/user ID to fetch condominiums for
   */
  getCondominiums(userId: string) {
    const self = this;
    return {
      queryKey: ['condominiums', userId] as const,
      queryFn: async (): Promise<CondominiumWithRole[]> => {
        if (!self.#networkStatus.isOnline()) {
          // Offline: read from local IndexedDB cache
          const entities = await self.#localRepo.getEntitiesByType('condominiums');
          return entities.map((e) => e.data as unknown as CondominiumWithRole);
        }

        // Online: fetch from Supabase via existing service
        await self.#condominiumService.fetchUserCondominiums({ profileId: userId });

        // Return from the existing service's BehaviorSubject
        return self.#condominiumService.userCondominiums$.getValue();
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    };
  }

  /**
   * Invalidate all condominium queries.
   * Call after a mutation that affects condominium data.
   */
  invalidateCondominiums(): void {
    this.#queryClient.invalidateQueries({ queryKey: ['condominiums'] });
  }
}
