import { inject, Injectable } from '@angular/core';
import { Network } from '@capacitor/network';
import type { NetworkStatus } from '@capacitor/network';
import { LocalRepository } from './local-repository';
import type { LocalDBSchema } from './local-db';
import { Supabase } from '@core/services/supabase/supabase';
import { QueryClient } from '@tanstack/angular-query-experimental';

/**
 * Calculate exponential backoff delay: 2^attempt × 1000ms.
 * Exported as a pure function for testability.
 */
export function calculateBackoff(retryCount: number): number {
  return Math.pow(2, retryCount) * 1000;
}

@Injectable({ providedIn: 'root' })
export class SyncService {
  #localRepo = inject(LocalRepository);
  #supabase = inject(Supabase);
  #queryClient = inject(QueryClient);
  #isOnline = navigator.onLine;

  constructor() {
    this.#initNetworkListener();
    this.#processOutboxOnReconnect();
  }

  async #initNetworkListener(): Promise<void> {
    try {
      const status = await Network.getStatus();
      this.#isOnline = status.connected;

      Network.addListener('networkStatusChange', (newStatus: NetworkStatus) => {
        const wasOffline = !this.#isOnline;
        this.#isOnline = newStatus.connected;

        if (wasOffline && this.#isOnline) {
          this.processOutbox();
        }
      });
    } catch {
      // Capacitor not available (web) — rely on navigator.onLine
      window.addEventListener('online', () => {
        const wasOffline = !this.#isOnline;
        this.#isOnline = true;
        if (wasOffline) {
          this.processOutbox();
        }
      });
      window.addEventListener('offline', () => {
        this.#isOnline = false;
      });
    }
  }

  /**
   * Returns whether the device is currently online.
   */
  isOnline(): boolean {
    return this.#isOnline;
  }

  /**
   * Enqueue a mutation to the outbox for deferred dispatch.
   * Called when offline or when a server mutation fails.
   */
  async enqueueMutation(
    mutationType: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<void> {
    await this.#localRepo.enqueueMutation({
      mutation_type: mutationType,
      entity_type: entityType,
      entity_id: entityId,
      payload,
      idempotency_key: idempotencyKey,
      retry_count: 0,
      max_retries: 5,
      last_error: null,
    });
  }

  /**
   * Process the outbox FIFO queue.
   * Dispatches mutations in chronological order with retry logic.
   * Public for manual triggering and testability.
   */
  async processOutbox(): Promise<void> {
    const pending = await this.#localRepo.getPendingMutations();

    for (const mutation of pending) {
      if (mutation.retry_count >= mutation.max_retries) {
        // Max retries exceeded — remove from queue (dead letter)
        await this.#localRepo.deleteMutation(mutation.id);
        continue;
      }

      try {
        await this.#dispatchMutation(mutation);
        await this.#localRepo.deleteMutation(mutation.id);

        // Invalidate affected queries to refresh from server
        this.#queryClient.invalidateQueries({
          queryKey: [mutation.entity_type],
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        await this.#localRepo.updateMutationRetry(
          mutation.id,
          mutation.retry_count + 1,
          errorMessage,
        );

        // Exponential backoff before next attempt
        const delay = calculateBackoff(mutation.retry_count);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Dispatch a single mutation to the server via Supabase RPC.
   */
  async #dispatchMutation(
    mutation: LocalDBSchema['outbox']['value'],
  ): Promise<void> {
    const { entity_type, mutation_type, payload, idempotency_key } = mutation;

    const rpcName = this.#buildRpcName(entity_type, mutation_type);
    if (!rpcName) {
      console.warn(
        `[SyncService] No RPC mapping for entity_type="${entity_type}" mutation_type="${mutation_type}"`,
      );
      throw new Error(`No RPC mapping for ${entity_type}/${mutation_type}`);
    }

    const rpcParams = this.#buildRpcParams(entity_type, mutation_type, payload, idempotency_key);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: { data: any; error: unknown } = await this.#supabase.client.rpc(rpcName, rpcParams);

    if (result.error) {
      throw result.error;
    }
  }

  /**
   * Build the RPC function name based on entity type and mutation type.
   * Returns null if no RPC exists for this combination.
   */
  #buildRpcName(entityType: string, mutationType: string): string | null {
    switch (entityType) {
      case 'expenditure':
        if (mutationType === 'create') return 'insert_expenditure_idempotent';
        if (mutationType === 'update') return 'update_expenditure_idempotent';
        if (mutationType === 'delete') return 'soft_delete_expenditure';
        return null;
      case 'income':
        if (mutationType === 'create') return 'insert_income_idempotent';
        if (mutationType === 'update') return 'update_income_idempotent';
        if (mutationType === 'delete') return 'soft_delete_income';
        return null;
      case 'account':
        if (mutationType === 'create') return 'insert_account_idempotent';
        if (mutationType === 'update') return 'update_account_idempotent';
        if (mutationType === 'delete') return 'soft_delete_account';
        return null;
      case 'structures':
        if (mutationType === 'create') return 'insert_structure_idempotent';
        if (mutationType === 'delete') return 'soft_delete_structure';
        return null;
      case 'properties':
        if (mutationType === 'create') return 'insert_property_idempotent';
        if (mutationType === 'delete') return 'soft_delete_property';
        return null;
      default:
        return null;
    }
  }

  /**
   * Build RPC parameters based on entity type and mutation type.
   */
  #buildRpcParams(
    entityType: string,
    mutationType: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Record<string, unknown> {
    if (mutationType === 'create') {
      return {
        p_idempotency_key: idempotencyKey,
        ...payload,
      };
    }

    if (mutationType === 'update') {
      return {
        p_idempotency_key: idempotencyKey,
        ...payload,
      };
    }

    if (mutationType === 'delete') {
      return {
        p_id: payload['id'],
        p_reversal_reason: payload['reversal_reason'] ?? 'Deleted via sync',
      };
    }

    return payload;
  }

  /**
   * Process any pending mutations on app start if online.
   */
  #processOutboxOnReconnect(): void {
    if (this.#isOnline) {
      this.processOutbox();
    }
  }
}
