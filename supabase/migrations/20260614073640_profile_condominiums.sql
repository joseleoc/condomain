-- =========================================================================
-- TABLA: profile_condominiums (Membresías e histórico de acceso)
-- =========================================================================
create table if not exists public.profile_condominiums (
    id uuid primary key default uuid_generate_v4(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    condominium_id uuid not null references public.condominiums(id) on delete cascade,
    role_id uuid not null references public.roles(id),
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint profile_condominiums_profile_condo_unique unique (profile_id, condominium_id)
);

comment on table public.profile_condominiums is 'Membership link between profiles and condominiums with role assignment.';

-- Trigger para mantener actualizado el campo updated_at
create trigger trg_profile_condominiums_updated_at
    before update on public.profile_condominiums
    for each row
    execute function public.set_current_timestamp_updated_at();

-- =========================================================================
-- FUNCTION & TRIGGER: Auto-asignación del creador/dueño
-- =========================================================================
-- Al insertar un condominio, este trigger vincula al dueño ('owner_id')
-- en la tabla profile_condominiums con el rol de 'resident_owner'.
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
    where r.name = 'resident_owner'
    limit 1;

    if v_owner_role_id is null then
        raise exception 'Role resident_owner not found in public.roles';
    end if;

    insert into public.profile_condominiums (profile_id, condominium_id, role_id)
    values (new.owner_id, new.id, v_owner_role_id)
    on conflict (profile_id, condominium_id) do nothing;

    return new;
end;
$$;

-- Nota: Si ya habías creado este trigger en la tabla condominiums antes, 
-- Postgres lo actualizará para apuntar a esta nueva función.
create or replace trigger trg_condominiums_owner_membership
    after insert on public.condominiums
    for each row
    execute function public.handle_new_condominium_owner_membership();


    -- Optimiza la búsqueda de condominios a los que pertenece un perfil específico
create index if not exists idx_profile_condominiums_profile_id
    on public.profile_condominiums (profile_id)
    where deleted_at is null;

-- Optimiza el listado de miembros pertenecientes a un condominio específico
create index if not exists idx_profile_condominiums_condo_id
    on public.profile_condominiums (condominium_id)
    where deleted_at is null;

-- Optimiza las validaciones de roles
create index if not exists idx_profile_condominiums_role_id
    on public.profile_condominiums (role_id)
    where deleted_at is null;



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



alter table public.profile_condominiums enable row level security;

-- SELECT: Ver su propio perfil/membresía o ser administrador/operador del condominio
drop policy if exists profile_condominiums_select_policy on public.profile_condominiums;
create policy profile_condominiums_select_policy
on public.profile_condominiums
for select
to authenticated
using (
    deleted_at is null
    and (
        profile_id = auth.uid()
        or public.has_condominium_role(condominium_id, '{"condominium_admin", "admin_operator"}'::text[])
    )
);

-- INSERT: Permitir agregar miembros si eres administrador o si eres el dueño que dispara el trigger
drop policy if exists profile_condominiums_insert_policy on public.profile_condominiums;
create policy profile_condominiums_insert_policy
on public.profile_condominiums
for insert
to authenticated
with check (
    public.has_condominium_role(condominium_id, '{"condominium_admin", "admin_operator"}'::text[])
    or exists (
        select 1 from public.condominiums c 
        where c.id = condominium_id and c.owner_id = auth.uid()
    )
);

-- UPDATE: Modificar roles de miembros (Exclusivo de administradores)
drop policy if exists profile_condominiums_update_policy on public.profile_condominiums;
create policy profile_condominiums_update_policy
on public.profile_condominiums
for update
to authenticated
using (
    deleted_at is null
    and public.has_condominium_role(condominium_id, '{"condominium_admin"}'::text[])
)
with check (
    public.has_condominium_role(condominium_id, '{"condominium_admin"}'::text[])
);