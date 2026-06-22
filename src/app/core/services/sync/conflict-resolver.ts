import { Injectable } from '@angular/core';

export interface ConflictRecord {
  entity_type: string;
  entity_id: string;
  local_version: number;
  server_version: number;
  local_data: Record<string, unknown>;
  server_data: Record<string, unknown>;
  resolution: 'server_wins' | 'merge' | 'manual_required';
  resolved_at: string;
}

@Injectable({ providedIn: 'root' })
export class ConflictResolver {
  #conflictLog: ConflictRecord[] = [];

  /**
   * Resolve a conflict between local and server versions of the same entity.
   * For accounting data, server is authoritative.
   */
  resolve<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    localVersion: number,
    serverVersion: number,
    localData: T,
    serverData: T,
  ): { winner: T; resolution: string; conflict: ConflictRecord } {
    if (serverVersion > localVersion) {
      // Server has a newer version — server wins
      const conflict: ConflictRecord = {
        entity_type: entityType,
        entity_id: entityId,
        local_version: localVersion,
        server_version: serverVersion,
        local_data: localData,
        server_data: serverData,
        resolution: 'server_wins',
        resolved_at: new Date().toISOString(),
      };
      this.#conflictLog.push(conflict);

      return {
        winner: serverData,
        resolution: 'server_wins',
        conflict,
      };
    }

    // Local is newer or equal — unexpected state, flag for manual review
    // Default to server data for safety
    const conflict: ConflictRecord = {
      entity_type: entityType,
      entity_id: entityId,
      local_version: localVersion,
      server_version: serverVersion,
      local_data: localData,
      server_data: serverData,
      resolution: 'manual_required',
      resolved_at: new Date().toISOString(),
    };
    this.#conflictLog.push(conflict);

    return {
      winner: serverData,
      resolution: 'manual_required',
      conflict,
    };
  }

  /**
   * Return an immutable copy of the conflict log for inspection.
   */
  getConflictLog(): ConflictRecord[] {
    return [...this.#conflictLog];
  }
}
