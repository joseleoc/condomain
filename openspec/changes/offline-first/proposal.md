# Proposal: Offline-First Infrastructure

## Intent

Transform Condomain from online-only to offline-first. Administrators must register expenses, reconcile income, and navigate accounts without connectivity (garages, basements). Data syncs automatically on reconnect.

## Scope

**In**: Backend (version columns, idempotent/delta-sync RPCs, soft delete). Local IndexedDB via `idb` (entity + outbox + sync_state stores). Sync layer (SyncService, SyncOrchestrator, ConflictResolver). TanStack Query provider + refactored services. `@capacitor/network` status. Offline account-tree service.

**Out**: Accounting features themselves. Migration of existing state. UI beyond an offline indicator. Supabase Realtime.

## Capabilities

### New Capabilities
- `backend-sync-infrastructure`: RPCs (idempotent insert, delta sync, soft delete); version/`updated_at`/`idempotency_key` columns; increment trigger
- `local-persistence`: IndexedDB stores + `LocalRepository`
- `sync-orchestration`: `SyncService` (network listener, outbox dispatch with backoff); `SyncOrchestrator` (delta fetch, conflict detect, local apply)
- `conflict-resolution`: `ConflictResolver` — server-wins for financial records, audit log
- `query-integration`: TanStack Query provider + IndexedDB persister; offline-aware services
- `account-tree-offline`: `AccountTreeService` — hierarchical tree from local DB
- `network-awareness`: `@capacitor/network` status as injectable signal

### Modified Capabilities
- None (no existing specs)

## Approach

3-phase chained PRs. **1**: Supabase migrations + RPCs. **2**: Client infra (IndexedDB, TanStack Query provider, sync layer). **3**: Service refactoring + network indicator. Tests precede all code (strict TDD).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/*` | New | Sync columns, triggers, RPCs |
| `src/app/core/services/sync/` | New | DB, repo, sync, orchestrator, resolver |
| `src/app/core/providers/` | New | Query config + persister |
| `src/app/core/services/condominium/` | Modified | TanStack Query pattern |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Change exceeds 400-line budget | High | Phase-chained PRs |
| Sync bugs corrupt data | Medium | Idempotency keys + server-wins + tests |
| IndexedDB quota on mobile | Low | Monitor via `navigator.storage.estimate()` |

## Rollback Plan

Revert phase commit. Outbox persists in IndexedDB — flushes on reapply. No hard deletes; soft delete + versioning preserve audit trail.

## Dependencies

- `@tanstack/angular-query-experimental` + `@tanstack/angular-query-devtools-experimental`
- `idb`, `@capacitor/network`, `uuid`, `@types/uuid`

## Success Criteria

- [ ] All RPCs defined with tests
- [ ] IndexedDB initializes on first load
- [ ] Records + pending outbox survive page reload
- [ ] Outbox dispatches FIFO on reconnect
- [ ] Conflicts resolved per business rules
- [ ] Account tree works from local DB offline
- [ ] Online/offline status as reactive signal
- [ ] All existing tests pass; new code at 80%+ coverage
