-- Habilitar la extensión para generación de UUIDs si no está activa
create extension if not exists "uuid-ossp";

-- =========================================================================
-- FUNCTION: Automatización de updated_at
-- =========================================================================
-- Esta función se ejecutará ANTES de cualquier UPDATE en las tablas,
-- garantizando que el frontend no pueda falsificar o ignorar la fecha de cambio.
create or replace function public.set_current_timestamp_updated_at()
returns trigger 
language plpgsql
security definer
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- =========================================================================
-- FUNCTION: Sincronización automática de Perfiles desde Auth (Opcional pero recomendado)
-- =========================================================================
-- En Supabase, la tabla auth.users la maneja el sistema de autenticación.
-- Para evitar que tu frontend tenga que hacer un "double-insert", este trigger
-- creará el perfil público automáticamente en cuanto el usuario se registre.
create or replace function public.handle_new_user_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, name, email, avatar)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;