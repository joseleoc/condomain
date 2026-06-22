import { ConflictResolver, type ConflictRecord } from './conflict-resolver';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('resolve()', () => {
    it('should return server data as winner when server version is newer', () => {
      const localData = { id: '1', name: 'local-name', version: 3 };
      const serverData = { id: '1', name: 'server-name', version: 5 };

      const result = resolver.resolve(
        'expenditure',
        'entity-1',
        3,
        5,
        localData,
        serverData,
      );

      expect(result.winner).toEqual(serverData);
      expect(result.resolution).toBe('server_wins');
    });

    it('should log a conflict record when server wins', () => {
      const localData = { id: '1', amount: 100, version: 3 };
      const serverData = { id: '1', amount: 150, version: 5 };

      const result = resolver.resolve(
        'expenditure',
        'exp-123',
        3,
        5,
        localData,
        serverData,
      );

      expect(result.conflict.entity_type).toBe('expenditure');
      expect(result.conflict.entity_id).toBe('exp-123');
      expect(result.conflict.local_version).toBe(3);
      expect(result.conflict.server_version).toBe(5);
      expect(result.conflict.local_data).toEqual(localData);
      expect(result.conflict.server_data).toEqual(serverData);
      expect(result.conflict.resolution).toBe('server_wins');
      expect(result.conflict.resolved_at).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });

    it('should flag as manual_required when local version equals server version', () => {
      const localData = { id: '1', name: 'local', version: 5 };
      const serverData = { id: '1', name: 'server', version: 5 };

      const result = resolver.resolve(
        'condominium',
        'condo-1',
        5,
        5,
        localData,
        serverData,
      );

      expect(result.resolution).toBe('manual_required');
      expect(result.winner).toEqual(serverData);
      expect(result.conflict.resolution).toBe('manual_required');
    });

    it('should flag as manual_required when local version is newer than server', () => {
      const localData = { id: '1', name: 'local', version: 6 };
      const serverData = { id: '1', name: 'server', version: 5 };

      const result = resolver.resolve(
        'expenditure',
        'exp-456',
        6,
        5,
        localData,
        serverData,
      );

      expect(result.resolution).toBe('manual_required');
      expect(result.winner).toEqual(serverData);
      expect(result.conflict.resolution).toBe('manual_required');
    });

    it('should add the conflict to the internal log', () => {
      const localData = { id: '1', version: 1 };
      const serverData = { id: '1', version: 2 };

      resolver.resolve('income', 'inc-1', 1, 2, localData, serverData);
      resolver.resolve('expenditure', 'exp-1', 2, 4, localData, serverData);

      const log = resolver.getConflictLog();
      expect(log.length).toBe(2);
    });
  });

  describe('getConflictLog()', () => {
    it('should return an empty array when no conflicts exist', () => {
      const log = resolver.getConflictLog();
      expect(log).toEqual([]);
    });

    it('should return all resolved conflicts', () => {
      const localData = { id: '1', version: 1 };
      const serverData = { id: '1', version: 2 };

      resolver.resolve('expenditure', 'exp-1', 1, 2, localData, serverData);
      resolver.resolve('income', 'inc-1', 1, 3, localData, serverData);
      resolver.resolve('condominium', 'condo-1', 2, 4, localData, serverData);

      const log = resolver.getConflictLog();
      expect(log.length).toBe(3);
      expect(log[0].entity_type).toBe('expenditure');
      expect(log[1].entity_type).toBe('income');
      expect(log[2].entity_type).toBe('condominium');
    });

    it('should return a copy that does not affect the internal log', () => {
      const localData = { id: '1', version: 1 };
      const serverData = { id: '1', version: 2 };

      resolver.resolve('expenditure', 'exp-1', 1, 2, localData, serverData);

      const log = resolver.getConflictLog();
      log.length = 0; // Mutate the returned array

      const log2 = resolver.getConflictLog();
      expect(log2.length).toBe(1);
    });
  });
});
