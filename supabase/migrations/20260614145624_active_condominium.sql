-- =========================================================================
-- ALTERACIÓN DE TABLA: profiles (Agregar condominio activo)
-- =========================================================================

-- 1. Agregar la columna con la relación de llave foránea
alter table public.profiles 
    add column if not exists active_condominium_id uuid references public.condominiums(id) on delete set null;


-- 2. Crear una función de validación para asegurar que el usuario pertenece a ese condominio
create or replace function public.check_profile_active_condominium()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Si el condominio activo no es nulo, verificar que exista una membresía válida y activa
    if new.active_condominium_id is not null then
        if not exists (
            select 1 
            from public.profile_condominiums pc
            where pc.profile_id = new.id 
              and pc.condominium_id = new.active_condominium_id
              and pc.deleted_at is null
        ) then
            raise exception 'Profile % does not have an active membership in condominium %', new.id, new.active_condominium_id;
        end if;
    end if;
    return new;
end;
$$;

-- 3. Crear el trigger que ejecute la validación antes de un INSERT o UPDATE en profiles
drop trigger if exists trg_profiles_active_condominium on public.profiles;
create trigger trg_profiles_active_condominium
    before insert or update of active_condominium_id on public.profiles
    for each row
    execute function public.check_profile_active_condominium();