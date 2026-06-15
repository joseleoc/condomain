-- =========================================================================
-- TABLE CREATION: structure_groups (Containers for Properties)
-- =========================================================================

create table if not exists public.structure_groups (
    id uuid primary key default gen_random_uuid(),
    condominium_id uuid not null references public.condominiums(id) on delete cascade,
    name text not null,
    structure_type text not null default 'Building', -- 'Building', 'Houses', 'Custom'
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,

    -- Integrity Constraints & Business Rules
    constraint structure_groups_name_not_empty check (char_length(trim(name)) > 0),
    constraint structure_groups_type_valid check (structure_type in ('Building', 'Houses', 'Custom')),
    
    -- Prevents duplicate structure names (e.g., two "Tower A") within the same condominium
    constraint structure_groups_name_condo_unique unique (condominium_id, name)
);

-- Schema Documentation
comment on table public.structure_groups is 'Physical or logical divisions within the condominium (Towers, Blocks, Stages).';
comment on column public.structure_groups.structure_type is 'Determines the massive matrix generation pattern in the frontend wizard.';

-- =========================================================================
-- AUTOMATED TIMESTAMP TRIGGER (updated_at)
-- =========================================================================
create or replace trigger handle_structure_groups_updated_at
    before update on public.structure_groups
    for each row
    execute function public.set_current_timestamp_updated_at();


-- =========================================================================
-- INDEXES CONFIGURATION (Performance Optimization)
-- =========================================================================

create index if not exists structure_groups_condominium_id_idx 
    on public.structure_groups (condominium_id);

create index if not exists structure_groups_active_lookup_idx 
    on public.structure_groups (condominium_id, name) 
    where deleted_at is null;


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- =========================================================================

alter table public.structure_groups enable row level security;


-- =========================================================================
-- RLS POLICIES (Role-Based Access Control)
-- =========================================================================

-- 1. SELECT POLICY: Any active member of the condominium can view its structure groups
drop policy if exists "Users can view structure groups of their condominiums" on public.structure_groups;
create policy "Users can view structure groups of their condominiums"
    on public.structure_groups
    for select
    using (
        exists (
            select 1 
            from public.profile_condominiums pc
            where pc.condominium_id = public.structure_groups.condominium_id
              and pc.profile_id = auth.uid()
              and pc.deleted_at is null
        )
        and deleted_at is null
    );

-- 2. INSERT POLICY: Only Administrators or Operators can create new structure groups
drop policy if exists "Admins and Operators can insert structure groups" on public.structure_groups;
create policy "Admins and Operators can insert structure groups"
    on public.structure_groups
    for insert
    with check (
        exists (
            select 1 
            from public.profile_condominiums pc
            join public.roles r on pc.role_id = r.id
            where pc.condominium_id = public.structure_groups.condominium_id
              and pc.profile_id = auth.uid()
              and pc.deleted_at is null
              and (r.name = 'condominium_admin' or r.name = 'admin_operator')
        )
    );

-- 3. UPDATE POLICY: Only Administrators or Operators can modify structure groups
drop policy if exists "Admins and Operators can update structure groups" on public.structure_groups;
create policy "Admins and Operators can update structure groups"
    on public.structure_groups
    for update
    using (
        exists (
            select 1 
            from public.profile_condominiums pc
            join public.roles r on pc.role_id = r.id
            where pc.condominium_id = public.structure_groups.condominium_id
              and pc.profile_id = auth.uid()
              and pc.deleted_at is null
              and (r.name = 'condominium_admin' or r.name = 'admin_operator')
        )
    )
    with check (
        exists (
            select 1 
            from public.profile_condominiums pc
            join public.roles r on pc.role_id = r.id
            where pc.condominium_id = public.structure_groups.condominium_id
              and pc.profile_id = auth.uid()
              and pc.deleted_at is null
              and (r.name = 'condominium_admin' or r.name = 'admin_operator')
        )
    );

-- 4. DELETE POLICY: Only full Administrators can physically/logically delete a structure group
drop policy if exists "Only Admins can delete structure groups" on public.structure_groups;
create policy "Only Admins can delete structure groups"
    on public.structure_groups
    for delete
    using (
        exists (
            select 1 
            from public.profile_condominiums pc
            join public.roles r on pc.role_id = r.id
            where pc.condominium_id = public.structure_groups.condominium_id
              and pc.profile_id = auth.uid()
              and pc.deleted_at is null
              and r.name = 'condominium_admin'
        )
    );