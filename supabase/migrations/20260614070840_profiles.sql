-- Crear la tabla de perfiles vinculada 1:1 con auth.users
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text,
    email text not null,
    phone_number text,
    avatar text,
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint profiles_email_unique unique (email)
);

comment on table public.profiles is 'Public user profile metadata linked to Supabase Auth.';

-- Trigger para mantener actualizado el campo updated_at en perfiles
create trigger trg_profiles_updated_at
    before update on public.profiles
    for each row
    execute function public.set_current_timestamp_updated_at();

-- Trigger en la tabla interna de Supabase Auth para automatizar la creación del perfil
drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user_signup();


    -- 1. Asegurar que el RLS esté activo en la tabla de perfiles
alter table public.profiles enable row level security;

-- 2. POLÍTICA: Permitir a usuarios autenticados LEER cualquier perfil activo
-- Nota: Filtramos de una vez para que no se puedan leer perfiles con borrado lógico.
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (
    deleted_at is null
);

-- 3. POLÍTICA: Permitir a los usuarios MODIFICAR únicamente su propio perfil
-- 'using' comprueba la fila existente; 'with check' valida los nuevos datos antes de guardar.
drop policy if exists profiles_update_owner on public.profiles;
create policy profiles_update_owner
on public.profiles
for update
to authenticated
using (
    auth.uid() = id
)
with check (
    auth.uid() = id
);