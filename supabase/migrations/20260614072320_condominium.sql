-- =========================================================================
-- TABLA: condominiums (Datos maestros del condominio)
-- =========================================================================
create table
    if not exists public.condominiums (
        id uuid primary key default uuid_generate_v4 (),
        name text not null,
        address text,
        avatar text,
        currency varchar(3) not null references public.currencies (iso_code),
        owner_id uuid not null references public.profiles (id) on delete cascade,
        active boolean not null default true,
        updated_at timestamptz not null default now (),
        created_at timestamptz not null default now (),
        deleted_at timestamptz,
        constraint condominiums_name_not_empty check (char_length(trim(name)) > 0)
    );

comment on table public.condominiums is 'Condominium master data.';

alter table public.condominiums enable row level security;

-- Triggers de tiempo para condominios
create trigger trg_condominiums_updated_at before
update on public.condominiums for each row execute function public.set_current_timestamp_updated_at ();

-- Indexar la llave foránea de la moneda (Indispensable para Joins financieros)
create index if not exists idx_condominiums_currency on public.condominiums (currency);

-- Indexar el dueño del condominio combinando su estado y ordenamiento por fecha
create index if not exists idx_condominiums_owner_active_updated_at on public.condominiums (owner_id, active, updated_at desc)
where
    deleted_at is null;

-- Índice alfabético para búsquedas o listados por nombre de condominio
create index if not exists idx_condominiums_name_lower on public.condominiums (lower(name))
where
    deleted_at is null;



-- =========================================================================
-- RLS: CONDOMINIUMS
-- =========================================================================

-- SELECT: Un usuario puede leer el condominio si es el dueño directo (owner_id) 
-- o si es un miembro activo (admin, operador o copropietario).
drop policy if exists condominiums_select_policy on public.condominiums;
create policy condominiums_select_policy
on public.condominiums
for select
to authenticated
using (
    deleted_at is null
    and (
        auth.uid() = owner_id
        or public.has_condominium_role(id, array['condominium_admin', 'admin_operator', 'resident_owner'])
    )
);

-- INSERT: Permitir a cualquier usuario crear un condominio siempre y cuando se declare como dueño
drop policy if exists condominiums_insert_policy on public.condominiums;
create policy condominiums_insert_policy
on public.condominiums
for insert
to authenticated
with check (
    auth.uid() = owner_id
);

-- UPDATE: Solo el dueño directo o los roles administrativos altos pueden modificar la configuración del condominio
drop policy if exists condominiums_update_policy on public.condominiums;
create policy condominiums_update_policy
on public.condominiums
for update
to authenticated
using (
    deleted_at is null 
    and (
        auth.uid() = owner_id 
        or public.has_condominium_role(id, array['condominium_admin'])
    )
)
with check (
    auth.uid() = owner_id 
    or public.has_condominium_role(id, array['condominium_admin'])
);