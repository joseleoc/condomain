create table
    if not exists public.currencies (
        iso_code varchar(3) primary key,
        name varchar(50) not null,
        symbol varchar(10) not null,
        minor_unit smallint not null default 2,
        created_at timestamptz not null default now (),
        updated_at timestamptz not null default now (),
        active boolean not null default true,
        constraint currencies_iso_code_uppercase check (iso_code = upper(iso_code)),
        constraint currencies_minor_unit_non_negative check (minor_unit >= 0)
    );

create trigger trg_currencies_updated_at before
update on public.currencies for each row execute function public.set_current_timestamp_updated_at ();

-- 1. Asegurar que el RLS esté activo en la tabla de monedas
alter table public.currencies enable row level security;

-- 2. POLÍTICA: Permitir lectura a usuarios autenticados y anónimos
-- Esto evita que el frontend falle si necesitas listar monedas antes de que inicien sesión
drop policy if exists currencies_select_public on public.currencies;

create policy currencies_select_public on public.currencies for
select
    to anon,
    authenticated using (true);

-- NOTA DE SEGURIDAD:
-- Al no declarar políticas para INSERT, UPDATE o DELETE, Postgres bloquea 
-- por defecto estas operaciones para 'anon' y 'authenticated'. Solo el rol 
-- administrador de Supabase (o tus scripts de migración) podrá alterarlas.
-- Índice para optimizar los ordenamientos y listados alfabéticos por nombre de moneda
create index if not exists idx_currencies_name on public.currencies (name);