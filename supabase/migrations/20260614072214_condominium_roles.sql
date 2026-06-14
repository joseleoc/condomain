-- =========================================================================
-- TABLA: roles (Catálogo maestro de roles dentro del condominio)
-- =========================================================================
create table
    if not exists public.roles (
        id uuid primary key default uuid_generate_v4 (),
        name text not null,
        description text,
        created_at timestamptz not null default now (),
        updated_at timestamptz not null default now (),
        deleted_at timestamptz,
        constraint roles_name_unique unique (name)
    );

comment on table public.roles is 'Role catalog used for condominium membership permissions.';

-- Triggers de tiempo para roles
create trigger trg_roles_updated_at before
update on public.roles for each row execute function public.set_current_timestamp_updated_at ();

alter table public.roles enable row level security;

-- =========================================================================
-- RLS: ROLES
-- =========================================================================
-- Permitir que cualquier usuario autenticado lea el catálogo de roles activos
drop policy if exists roles_select_authenticated on public.roles;

create policy roles_select_authenticated on public.roles for
select
    to authenticated using (deleted_at is null);