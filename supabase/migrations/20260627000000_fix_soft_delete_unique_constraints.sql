-- =========================================================================
-- FIX: Soft Delete Support for Structures and Properties
-- =========================================================================
-- Problem 1: The original unique constraints don't account for soft-deleted records.
-- This prevents creating a new structure/property with the same name as a soft-deleted one.
-- Solution: Replace constraints with partial unique indexes that exclude soft-deleted records.
--
-- Problem 2: The SyncService expects RPC functions for soft delete, but they don't exist.
-- Solution: Create the missing RPC functions for offline sync support.

-- =========================================================================
-- PART 1: PARTIAL UNIQUE INDEXES FOR SOFT DELETE
-- =========================================================================

-- STRUCTURES: Replace unique constraint with partial index
alter table public.structures drop constraint if exists structures_name_condo_unique;

create unique index if not exists structures_name_condo_unique_active
    on public.structures (condominium_id, name)
    where deleted_at is null;

-- PROPERTIES: Replace unique constraint with partial index
alter table public.properties drop constraint if exists properties_unique_number_per_structure;

create unique index if not exists properties_unique_number_per_structure_active
    on public.properties (structure_id, name)
    where deleted_at is null;


-- =========================================================================
-- PART 2: RPC FUNCTIONS FOR SOFT DELETE (Offline Sync Support)
-- =========================================================================

-- FUNCTION: soft_delete_structure
-- Soft deletes a structure by setting deleted_at timestamp
-- Validates that the caller has admin/operator permissions for the condominium
create or replace function public.soft_delete_structure(
    p_id uuid,
    p_reversal_reason text default 'Deleted via sync'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_condominium_id uuid;
    v_has_permission boolean;
begin
    -- Get the condominium_id for this structure
    select condominium_id into v_condominium_id
    from public.structures
    where id = p_id and deleted_at is null;
    
    if not found then
        raise exception 'Structure not found or already deleted: %', p_id;
    end if;
    
    -- Check if the caller has admin/operator permissions
    select exists (
        select 1
        from public.profile_condominiums pc
        join public.roles r on pc.role_id = r.id
        where pc.condominium_id = v_condominium_id
          and pc.profile_id = auth.uid()
          and pc.deleted_at is null
          and (r.name = 'condominium_admin' or r.name = 'admin_operator')
    ) into v_has_permission;
    
    if not v_has_permission then
        raise exception 'Insufficient permissions to delete structure';
    end if;
    
    -- Perform the soft delete
    update public.structures
    set deleted_at = now(),
        updated_at = now()
    where id = p_id;
end;
$$;

-- FUNCTION: soft_delete_property
-- Soft deletes a property by setting deleted_at timestamp
-- Validates that the caller has admin/operator permissions for the condominium
create or replace function public.soft_delete_property(
    p_id uuid,
    p_reversal_reason text default 'Deleted via sync'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_condominium_id uuid;
    v_has_permission boolean;
begin
    -- Get the condominium_id for this property
    select condominium_id into v_condominium_id
    from public.properties
    where id = p_id and deleted_at is null;
    
    if not found then
        raise exception 'Property not found or already deleted: %', p_id;
    end if;
    
    -- Check if the caller has admin/operator permissions
    select exists (
        select 1
        from public.profile_condominiums pc
        join public.roles r on pc.role_id = r.id
        where pc.condominium_id = v_condominium_id
          and pc.profile_id = auth.uid()
          and pc.deleted_at is null
          and (r.name = 'condominium_admin' or r.name = 'admin_operator')
    ) into v_has_permission;
    
    if not v_has_permission then
        raise exception 'Insufficient permissions to delete property';
    end if;
    
    -- Perform the soft delete
    update public.properties
    set deleted_at = now(),
        updated_at = now()
    where id = p_id;
end;
$$;


-- =========================================================================
-- GRANTS: Allow authenticated users to execute soft delete functions
-- =========================================================================
grant execute on function public.soft_delete_structure(uuid, text) to authenticated;
grant execute on function public.soft_delete_property(uuid, text) to authenticated;


-- =========================================================================
-- DOCUMENTATION
-- =========================================================================

comment on index public.structures_name_condo_unique_active is 
    'Ensures unique structure names within a condominium, excluding soft-deleted records.';

comment on index public.properties_unique_number_per_structure_active is 
    'Ensures unique property names within a structure, excluding soft-deleted records.';

comment on function public.soft_delete_structure is 
    'Soft deletes a structure by setting deleted_at. Used by SyncService for offline mutations.';

comment on function public.soft_delete_property is 
    'Soft deletes a property by setting deleted_at. Used by SyncService for offline mutations.';
