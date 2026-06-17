-- =========================================================================
-- 1. ESTRUCTURA DE TABLAS (Catálogos y Entidades Maestro)
-- =========================================================================

-- TABLA: roles
create table if not exists public.roles (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint roles_name_unique unique (name)
);

comment on table public.roles is 'Role catalog used for condominium membership permissions.';

-- Trigger de tiempo para roles
create trigger trg_roles_updated_at
    before update on public.roles
    for each row
    execute function public.set_current_timestamp_updated_at();

-- Poblado inicial de roles
insert into public.roles (name, description)
values 
    ('condominium_admin', 'Administrador principal del condominio con control total.'),
    ('admin_operator', 'Operador administrativo encargado de la carga de datos.'),
    ('resident_owner', 'Copropietario residente con acceso a su propia información.')
on conflict (name) do update set description = excluded.description;


-- TABLA: condominiums
create table if not exists public.condominiums (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    address text,
    avatar text,
    currency varchar(3) not null references public.currencies(iso_code),
    owner_id uuid not null references public.profiles(id) on delete cascade,
    active boolean not null default true,
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint condominiums_name_not_empty check (char_length(trim(name)) > 0)
);

comment on table public.condominiums is 'Condominium master data.';

-- Trigger de tiempo para condominios
create trigger trg_condominiums_updated_at
    before update on public.condominiums
    for each row
    execute function public.set_current_timestamp_updated_at();


-- TABLA: profile_condominiums (Membresías)
create table if not exists public.profile_condominiums (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    condominium_id uuid not null references public.condominiums(id) on delete cascade,
    role_id uuid not null references public.roles(id),
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint profile_condominiums_profile_condo_unique unique (profile_id, condominium_id)
);

comment on table public.profile_condominiums is 'Membership link between profiles and condominiums with role assignment.';

-- Trigger de tiempo para profile_condominiums
create trigger trg_profile_condominiums_updated_at
    before update on public.profile_condominiums
    for each row
    execute function public.set_current_timestamp_updated_at();


-- =========================================================================
-- 2. DISPARADORES DE AUTOMATIZACIÓN (Triggers de lógica de negocio)
-- =========================================================================

create or replace function public.handle_new_condominium_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner_role_id uuid;
begin
    select r.id into v_owner_role_id
    from public.roles r
    where r.name = 'condominium_admin'
    limit 1;

    if v_owner_role_id is null then
        raise exception 'Role condominium_admin not found in public.roles';
    end if;

    insert into public.profile_condominiums (profile_id, condominium_id, role_id)
    values (new.owner_id, new.id, v_owner_role_id)
    on conflict (profile_id, condominium_id) do nothing;

    return new;
end;
$$;

create or replace trigger trg_condominiums_owner_membership
    after insert on public.condominiums
    for each row
    execute function public.handle_new_condominium_owner_membership();


-- =========================================================================
-- 3. FUNCIONES DE CONTROL DE ACCESO
-- =========================================================================

create or replace function public.is_condominium_member(
    p_condominium_id uuid,
    p_profile_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profile_condominiums pc
        where pc.condominium_id = p_condominium_id
            and pc.profile_id = p_profile_id
            and pc.deleted_at is null
    );
$$;

create or replace function public.has_condominium_role(
    p_condominium_id uuid,
    p_role_names text[],
    p_profile_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profile_condominiums pc
        join public.roles r on r.id = pc.role_id
        where pc.condominium_id = p_condominium_id
            and pc.profile_id = p_profile_id
            and pc.deleted_at is null
            and r.name = any (p_role_names)
            and r.deleted_at is null
    );
$$;


-- =========================================================================
-- 4. ÍNDICES DE RENDIMIENTO (Performance optimization)
-- =========================================================================

-- Índices de Condominios
create index if not exists idx_condominiums_currency on public.condominiums (currency);
create index if not exists idx_condominiums_owner_active_updated_at on public.condominiums (owner_id, active, updated_at desc) where deleted_at is null;
create index if not exists idx_condominiums_name_lower on public.condominiums (lower(name)) where deleted_at is null;

-- Índices de Membresías
create index if not exists idx_profile_condominiums_profile_id on public.profile_condominiums (profile_id) where deleted_at is null;
create index if not exists idx_profile_condominiums_condo_id on public.profile_condominiums (condominium_id) where deleted_at is null;
create index if not exists idx_profile_condominiums_role_id on public.profile_condominiums (role_id) where deleted_at is null;


-- =========================================================================
-- 5. SEGURIDAD: ROW LEVEL SECURITY & POLICIES (Sintaxis ARRAY nativa)
-- =========================================================================

alter table public.roles enable row level security;
alter table public.condominiums enable row level security;
alter table public.profile_condominiums enable row level security;

-- POLÍTICAS: roles
drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated on public.roles
for select to authenticated using (deleted_at is null);

-- POLÍTICAS: condominiums
drop policy if exists condominiums_select_policy on public.condominiums;
create policy condominiums_select_policy on public.condominiums
for select to authenticated
using (
    deleted_at is null
    and (
        auth.uid() = owner_id
        or public.has_condominium_role(id, array['condominium_admin', 'admin_operator', 'resident_owner'])
    )
);

drop policy if exists condominiums_insert_policy on public.condominiums;
create policy condominiums_insert_policy on public.condominiums
for insert to authenticated
with check (auth.uid() = owner_id);

drop policy if exists condominiums_update_policy on public.condominiums;
create policy condominiums_update_policy on public.condominiums
for update to authenticated
using (
    deleted_at is null 
    and (auth.uid() = owner_id or public.has_condominium_role(id, array['condominium_admin']))
)
with check (
    auth.uid() = owner_id or public.has_condominium_role(id, array['condominium_admin'])
);

-- POLÍTICAS: profile_condominiums
drop policy if exists profile_condominiums_select_policy on public.profile_condominiums;
create policy profile_condominiums_select_policy on public.profile_condominiums
for select to authenticated
using (
    deleted_at is null
    and (profile_id = auth.uid() or public.has_condominium_role(condominium_id, array['condominium_admin', 'admin_operator']))
);

drop policy if exists profile_condominiums_insert_policy on public.profile_condominiums;
create policy profile_condominiums_insert_policy on public.profile_condominiums
for insert to authenticated
with check (
    public.has_condominium_role(condominium_id, array['condominium_admin', 'admin_operator'])
    or exists (select 1 from public.condominiums c where c.id = condominium_id and c.owner_id = auth.uid())
);

drop policy if exists profile_condominiums_update_policy on public.profile_condominiums;
create policy profile_condominiums_update_policy on public.profile_condominiums
for update to authenticated
using (deleted_at is null and public.has_condominium_role(condominium_id, array['condominium_admin']))
with check (public.has_condominium_role(condominium_id, array['condominium_admin']));


-- =========================================================================
-- 6. ASIGNACIÓN DE PRIVILEGIOS DE ACCESO (Grants indispensables)
-- =========================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.roles to authenticated;
grant select, insert, update, delete on public.condominiums to authenticated;
grant select, insert, update, delete on public.profile_condominiums to authenticated;
grant select on public.roles to anon;
grant select on public.condominiums to anon;