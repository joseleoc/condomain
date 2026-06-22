# Tasks: Offline-First Infrastructure

## Scope Note

This change implements **offline-first infrastructure only** — the sync layer, local persistence, and state management. It does NOT create domain tables (expenditures, incomes, accounts) or domain-specific services. Those will be added in future changes when the accounting feature is built.

The infrastructure works with **existing tables**: `profiles`, `condominiums`, `structures`, `properties`, `currencies`, `roles`, `profile_condominiums`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1100 |
| 500-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Backend) → PR 2 (Local infra) → PR 3 (Sync engine) → PR 4 (Service wiring) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
500-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Supabase migrations (sync columns + version trigger) | PR 1 | Base: main; 2 SQL files; ~150 lines |
| 2 | Local DB, repo, network, query provider | PR 2 | Base: main; ~300 lines + tests |
| 3 | Sync engine (SyncService, Orchestrator, ConflictResolver) | PR 3 | Base: PR 2 branch; depends on IDB |
| 4 | Service wiring (condominium service + main.ts + offline indicator) | PR 4 | Base: PR 3 branch; wires everything |

## Phase 1: Backend

- [x] 1.1 Migration: ADD sync columns (`version`, `created_by`, `idempotency_key`) + indexes to 7 existing tables
- [x] 1.2 Migration: CREATE `increment_version_on_update()` trigger, apply to all 7 tables
- [ ] 1.3 Migration: CREATE generic sync RPC template functions — **DEFERRED** (templates for future domain tables; not needed until domain features are built)
- [ ] 1.4 Test: Verify migrations run cleanly against local Supabase — **DEFERRED** (requires local Supabase running; verify when domain RPCs are added)

## Phase 2: Client Infrastructure

- [x] 2.1 Install deps: `@tanstack/angular-query-experimental`, `idb`, `@capacitor/network`, `uuid` (+ dev: devtools, `@types/uuid`)
- [x] 2.2 Create `services/sync/local-db.ts` — `openDB` with entity stores (generic), outbox, sync_state, query_cache + `getLocalDB()` singleton
- [x] 2.3 Create `services/sync/local-repository.ts` — generic CRUD per entity store, outbox enqueue/FIFO/retry-update/delete, sync state get/set
- [x] 2.4 Create `services/network-status.service.ts` — injectable `Signal<boolean>` via Capacitor + web fallback
- [x] 2.5 Create `providers/query.provider.ts` — `provideQuery()` with staleTime:5min, retry:3, IndexedDB persister
- [x] 2.6 Write tests: IDB init, LocalRepository CRUD + FIFO, NetworkStatus signal updates (min 80% coverage)

## Phase 3: Sync Engine

- [x] 3.1 Create `services/sync/conflict-resolver.ts` — server-wins for data conflicts, conflict log, `manual_required` flag
- [x] 3.2 Create `services/sync/sync-service.ts` — network listener, `enqueueMutation()`, outbox dispatch with exponential backoff (2^n × 1s, max 5), query invalidation
- [x] 3.3 Create `services/sync/sync-orchestrator.ts` — `sync(entityType, condoId)`: delta fetch → conflict detect → resolve → apply → update sync timestamp → invalidate
- [x] 3.4 Create `services/sync/index.ts` — barrel exports
- [x] 3.5 Write tests: ConflictResolver scenarios, SyncService outbox dispatch + backoff, SyncOrchestrator delta + conflict detection (min 80% coverage)

## Phase 4: Service Wiring

- [x] 4.1 Create `services/condominium-query.service.ts` — TanStack Query wrapper for condominium data (online→Supabase, offline→IDB cache), proof-of-concept for service migration pattern
- [x] 4.2 Create `shared/components/offline-indicator/` — small UI component showing online/offline status
- [x] 4.3 Modify `main.ts` — add `provideQuery()` to `bootstrapApplication` providers
- [x] 4.4 Write tests: CondominiumQueryService online/offline paths, offline-indicator rendering (min 70% coverage)
