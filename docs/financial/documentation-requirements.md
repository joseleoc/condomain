# Financial Module - Documentation Requirements

## Overview

This document defines the documentation requirements for each phase of the Financial Module. **Documentation is mandatory before proceeding to the next phase.**

---

## Documentation Structure

Each phase must have a dedicated documentation file in `docs/financial/`:

```
docs/financial/
├── phase-1-wallets-categories.md
├── phase-2-transactions.md
── phase-3-accounting-engine.md
├── phase-4-approval-reconciliation.md
└── phase-5-reports.md (future)
```

---

## Required Content Per Phase

### 1. Description General
- Purpose of the phase
- Key concepts introduced
- User-facing features

### 2. Database Schema
- Complete table definitions with all columns
- Indexes and their purpose
- Triggers and their behavior
- RLS policies
- Seed data (if applicable)

### 3. Services Angular
- Service purpose and responsibility
- **TSDoc for every public method** including:
  - Description of what the method does
  - Parameters with types and descriptions
  - Return value with type and description
  - Online/offline behavior (if applicable)
  - Error handling
- State management (BehaviorSubjects)
- Dependencies injected

### 4. TypeScript Types
- Complete interface definitions
- DTOs for create/update operations
- Type unions and enums

### 5. Migrations
- List of migration files
- Purpose of each migration
- Rollback instructions (if needed)

### 6. Tests
- Test coverage requirements (80%+)
- Key test scenarios
- Testing approach (unit, integration)

### 7. Dependencies
- What this phase requires from previous phases
- What this phase blocks for future phases

---

## TSDoc Requirements

All public methods in services MUST have TSDoc comments:

```typescript
/**
 * Brief description of what the method does.
 * 
 * Additional details about behavior, edge cases, or important notes.
 * 
 * @param paramName - Description of the parameter
 * @param anotherParam - Description with type info if not obvious
 * @returns Description of return value
 * 
 * @example
 * // Example usage (optional but recommended)
 * const result = await service.methodName(param1, param2);
 * 
 * @throws ErrorType - When this error is thrown (optional)
 */
async methodName(paramName: string, anotherParam: number): Promise<ReturnType>
```

### Required TSDoc Elements:

1. **Description**: Clear, concise explanation of purpose
2. **@param**: Every parameter with description
3. **@returns**: Return value description
4. **Online/Offline behavior**: For services with offline-first pattern
5. **Side effects**: If method modifies state or triggers other actions

---

## Phase Completion Checklist

Before marking a phase as complete and proceeding to the next:

- [ ] Documentation file created in `docs/financial/phase-X-*.md`
- [ ] All sections completed (Description, DB, Services, Types, Migrations, Tests, Dependencies)
- [ ] All public service methods have TSDoc comments
- [ ] TSDoc includes @param and @returns for all methods
- [ ] Online/offline behavior documented for offline-first services
- [ ] Code reviewed and approved
- [ ] Tests passing (80%+ coverage)
- [ ] Build successful
- [ ] Migrations applied to local database
- [ ] Push to GitHub completed

---

## Phase Status

| Phase | Documentation | TSDoc | Status |
|-------|--------------|-------|--------|
| **Phase 1**: Wallets & Categories | ✅ `phase-1-wallets-categories.md` | ✅ Complete | **DONE** |
| **Phase 2**: Transactions | ✅ `phase-2-transactions.md` | ✅ Complete | **DONE** |
| **Phase 3**: Accounting Engine | ✅ `phase-3-accounting-engine.md` | ✅ Complete | **DONE** |
| **Phase 4**: Approval & Reconciliation | ✅ `phase-4-approval-reconciliation.md` | ✅ Complete | **DONE** |
| **Phase 5**: Reports | ⏳ Pending | ⏳ Pending | **NOT STARTED** |

---

## Next Phase: Phase 5 - Reports

### Requirements

Before starting Phase 5, ensure:

1. ✅ Phase 4 documentation complete
2. ✅ All TSDoc comments added
3. ✅ All tests passing
4. ✅ Code pushed to GitHub

### Phase 5 Scope (Preliminary)

- Monthly balance snapshots (`account_monthly_balances`)
- Legal reports: Libro Diario, Libro Mayor
- Financial statements: Balance General, Estado de Resultados
- Dashboard UI with charts

---

## Maintenance

This document should be updated when:
- New phases are added
- Documentation requirements change
- Phase status changes

**Last updated**: 2026-07-06
