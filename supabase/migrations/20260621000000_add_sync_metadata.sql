-- =========================================================================
-- Migration: Add sync metadata columns to all existing tables
-- Tables: profiles, currencies, roles, condominiums, profile_condominiums,
--         structures, properties
-- Columns: version, created_by, idempotency_key, deleted_at (where missing)
-- Indexes: idx_<table>_updated_at, idx_<table>_idempotency_key
-- =========================================================================

-- ---------------------------------------------------------------------------
-- profiles (already has updated_at, deleted_at)
-- ---------------------------------------------------------------------------
alter table public.profiles
    add column if not exists version bigint not null default 1,
    add column if not exists created_by uuid not null default auth.uid(),
    add column if not exists idempotency_key uuid not null default gen_random_uuid();

create index if not exists idx_profiles_updated_at
    on public.profiles (updated_at desc);
create index if not exists idx_profiles_idempotency_key
    on public.profiles (idempotency_key);

-- ---------------------------------------------------------------------------
-- currencies (already has updated_at; missing deleted_at)
-- ---------------------------------------------------------------------------
alter table public.currencies
    add column if not exists version bigint not null default 1,
    add column if not exists created_by uuid default auth.uid(),
    add column if not exists idempotency_key uuid not null default gen_random_uuid(),
    add column if not exists deleted_at timestamptz;

create index if not exists idx_currencies_updated_at
    on public.currencies (updated_at desc);
create index if not exists idx_currencies_idempotency_key
    on public.currencies (idempotency_key);

-- ---------------------------------------------------------------------------
-- roles (already has updated_at, deleted_at)
-- ---------------------------------------------------------------------------
alter table public.roles
    add column if not exists version bigint not null default 1,
    add column if not exists created_by uuid default auth.uid(),
    add column if not exists idempotency_key uuid not null default gen_random_uuid();

create index if not exists idx_roles_updated_at
    on public.roles (updated_at desc);
create index if not exists idx_roles_idempotency_key
    on public.roles (idempotency_key);

-- ---------------------------------------------------------------------------
-- condominiums (already has updated_at, deleted_at)
-- ---------------------------------------------------------------------------
alter table public.condominiums
    add column if not exists version bigint not null default 1,
    add column if not exists created_by uuid not null default auth.uid(),
    add column if not exists idempotency_key uuid not null default gen_random_uuid();

create index if not exists idx_condominiums_updated_at
    on public.condominiums (updated_at desc);
create index if not exists idx_condominiums_idempotency_key
    on public.condominiums (idempotency_key);

-- ---------------------------------------------------------------------------
-- profile_condominiums (already has updated_at, deleted_at)
-- ---------------------------------------------------------------------------
alter table public.profile_condominiums
    add column if not exists version bigint not null default 1,
    add column if not exists created_by uuid not null default auth.uid(),
    add column if not exists idempotency_key uuid not null default gen_random_uuid();

create index if not exists idx_profile_condominiums_updated_at
    on public.profile_condominiums (updated_at desc);
create index if not exists idx_profile_condominiums_idempotency_key
    on public.profile_condominiums (idempotency_key);

-- ---------------------------------------------------------------------------
-- structures (already has updated_at, deleted_at)
-- ---------------------------------------------------------------------------
alter table public.structures
    add column if not exists version bigint not null default 1,
    add column if not exists created_by uuid not null default auth.uid(),
    add column if not exists idempotency_key uuid not null default gen_random_uuid();

create index if not exists idx_structures_updated_at
    on public.structures (updated_at desc);
create index if not exists idx_structures_idempotency_key
    on public.structures (idempotency_key);

-- ---------------------------------------------------------------------------
-- properties (already has updated_at, deleted_at)
-- ---------------------------------------------------------------------------
alter table public.properties
    add column if not exists version bigint not null default 1,
    add column if not exists created_by uuid not null default auth.uid(),
    add column if not exists idempotency_key uuid not null default gen_random_uuid();

create index if not exists idx_properties_updated_at
    on public.properties (updated_at desc);
create index if not exists idx_properties_idempotency_key
    on public.properties (idempotency_key);
