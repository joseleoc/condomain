-- =========================================================================
-- Migration: Create version auto-increment trigger
-- Replaces existing set_current_timestamp_updated_at triggers with a
-- unified trigger that increments version AND updates updated_at.
-- Applied to: profiles, currencies, roles, condominiums,
--             profile_condominiums, structures, properties
-- =========================================================================

-- ---------------------------------------------------------------------------
-- Create the unified version increment function
-- ---------------------------------------------------------------------------
create or replace function public.increment_version_on_update()
returns trigger
language plpgsql
as $$
begin
    new.version := old.version + 1;
    new.updated_at := now();
    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Drop old updated_at-only triggers (they are superseded by the new one)
-- ---------------------------------------------------------------------------
drop trigger if exists trg_profiles_updated_at on public.profiles;
drop trigger if exists trg_currencies_updated_at on public.currencies;
drop trigger if exists trg_roles_updated_at on public.roles;
drop trigger if exists trg_condominiums_updated_at on public.condominiums;
drop trigger if exists trg_profile_condominiums_updated_at on public.profile_condominiums;
drop trigger if exists handle_structures_updated_at on public.structures;
drop trigger if exists handle_properties_updated_at on public.properties;

-- ---------------------------------------------------------------------------
-- Apply the new version trigger to all 7 sync tables
-- ---------------------------------------------------------------------------
create trigger trg_profiles_version
    before update on public.profiles
    for each row
    execute function public.increment_version_on_update();

create trigger trg_currencies_version
    before update on public.currencies
    for each row
    execute function public.increment_version_on_update();

create trigger trg_roles_version
    before update on public.roles
    for each row
    execute function public.increment_version_on_update();

create trigger trg_condominiums_version
    before update on public.condominiums
    for each row
    execute function public.increment_version_on_update();

create trigger trg_profile_condominiums_version
    before update on public.profile_condominiums
    for each row
    execute function public.increment_version_on_update();

create trigger trg_structures_version
    before update on public.structures
    for each row
    execute function public.increment_version_on_update();

create trigger trg_properties_version
    before update on public.properties
    for each row
    execute function public.increment_version_on_update();
