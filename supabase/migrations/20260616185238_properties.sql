alter table public.structures add constraint structures_id_condominium_unique unique (id, condominium_id);

create table
    if not exists public.properties (
        id uuid primary key default gen_random_uuid (),
        condominium_id uuid not null references public.condominiums (id) on delete cascade,
        structure_id uuid not null references public.structures (id) on delete cascade,
        name text not null,
        share_percentage numeric(7, 4) not null,
        created_at timestamptz not null default clock_timestamp (),
        updated_at timestamptz not null default clock_timestamp (),
        deleted_at timestamptz,
        -- prevent empty or whitespace-only property names
        constraint properties_number_not_empty check (
            char_length(
                trim(
                    both
                    from
                        name
                )
            ) > 0
        ),
        -- The property share percentage cannot be negative and rarely a single unit is 100%
        constraint properties_share_percentage_range check (
            share_percentage >= 0
            and share_percentage <= 100
        ),
        -- Integrity Constraint: The structure_id must belong to the same condominium_id to maintain data consistency
        constraint properties_structure_condominium_fk foreign key (structure_id, condominium_id) references public.structures (id, condominium_id) on delete cascade,
        -- Unicity: No two properties can have the same name within the same structure_id (building)
        constraint properties_unique_number_per_structure unique (structure_id, name)
    );

-- =========================================================================
-- INDEXES CONFIGURATION (Performance Optimization)
-- =========================================================================
create index if not exists properties_condominium_id_idx on public.properties (condominium_id);

create index if not exists properties_structure_id_idx on public.properties (structure_id);

-- Optimiza la carga de todas las propiedades de un condominio
create index if not exists properties_condominium_id_idx on public.properties (condominium_id);

-- Optimiza la carga de propiedades filtradas por su grupo/estructura (Torre A, Bloque B)
create index if not exists properties_structure_id_idx on public.properties (structure_id);

-- Optimiza las búsquedas de propiedades activas excluyendo las borradas lógicamente
create index if not exists properties_active_lookup_idx on public.properties (condominium_id, name)
where
    deleted_at is null;

create index if not exists properties_active_lookup_idx on public.properties (condominium_id)
where
    deleted_at is null;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- =========================================================================
alter table public.properties enable row level security;

-- =========================================================================
-- RLS POLICIES (Role-Based Access Control)
-- =========================================================================
-- 1. SELECT POLICY: Cualquier miembro activo del condominio puede ver sus propiedades
drop policy if exists "Users can view properties of their condominiums" on public.properties;

create policy "Users can view properties of their condominiums" on public.properties for
select
    using (
        exists (
            select
                1
            from
                public.profile_condominiums pc
            where
                pc.condominium_id = public.properties.condominium_id
                and pc.profile_id = auth.uid ()
                and pc.deleted_at is null
        )
        and deleted_at is null
    );

-- 2. INSERT POLICY: Solo Administradores u Operadores pueden crear propiedades
drop policy if exists "Admins and Operators can insert properties" on public.properties;

create policy "Admins and Operators can insert properties" on public.properties for insert
with
    check (
        exists (
            select
                1
            from
                public.profile_condominiums pc
                join public.roles r on pc.role_id = r.id
            where
                pc.condominium_id = public.properties.condominium_id
                and pc.profile_id = auth.uid ()
                and pc.deleted_at is null
                and (
                    r.name = 'condominium_admin'
                    or r.name = 'admin_operator'
                )
        )
    );

-- 3. UPDATE POLICY: Solo Administradores u Operadores pueden modificar propiedades
drop policy if exists "Admins and Operators can update properties" on public.properties;

create policy "Admins and Operators can update properties" on public.properties for
update using (
    exists (
        select
            1
        from
            public.profile_condominiums pc
            join public.roles r on pc.role_id = r.id
        where
            pc.condominium_id = public.properties.condominium_id
            and pc.profile_id = auth.uid ()
            and pc.deleted_at is null
            and (
                r.name = 'condominium_admin'
                or r.name = 'admin_operator'
            )
    )
)
with
    check (
        exists (
            select
                1
            from
                public.profile_condominiums pc
                join public.roles r on pc.role_id = r.id
            where
                pc.condominium_id = public.properties.condominium_id
                and pc.profile_id = auth.uid ()
                and pc.deleted_at is null
                and (
                    r.name = 'condominium_admin'
                    or r.name = 'admin_operator'
                )
        )
    );

-- 4. DELETE POLICY: Solo los Administradores totales pueden borrar propiedades (física o lógicamente si aplica)
drop policy if exists "Only Admins can delete properties" on public.properties;

create policy "Only Admins can delete properties" on public.properties for delete using (
    exists (
        select
            1
        from
            public.profile_condominiums pc
            join public.roles r on pc.role_id = r.id
        where
            pc.condominium_id = public.properties.condominium_id
            and pc.profile_id = auth.uid ()
            and pc.deleted_at is null
            and r.name = 'condominium_admin'
    )
);

-- =========================================================================
-- AUTOMATED TIMESTAMP TRIGGER (updated_at)
-- =========================================================================
create
or replace trigger handle_properties_updated_at before
update on public.properties for each row execute function public.set_current_timestamp_updated_at ();

-- =========================================================================
-- SCHEMA DOCUMENTATION
-- =========================================================================
comment on table public.properties is 'The smallest billable unit within a condominium (apartments, houses, parking spots, storage rooms).';

comment on column public.properties.share_percentage is 'The coefficient (alícuota) used to calculate maintenance fees and voting weight (exact numeric decimal).';

comment on column public.properties.structure_id is 'Foreign key linking the property to its specific building tower, housing block, or sector.';

-- =========================================================================
-- GRANTS CONFIGURATION (Permisos de Acceso API)
-- =========================================================================
grant
select
,
    insert,
update,
delete on table public.properties to authenticated;

grant
select
    on table public.properties to anon;

grant all on table public.properties to service_role;