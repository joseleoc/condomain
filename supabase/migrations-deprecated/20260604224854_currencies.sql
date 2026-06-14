create table if not exists public.currencies (
    iso_code varchar(3) primary key,
    name varchar(50) not null,
    symbol varchar(10) not null,
    minor_unit smallint not null default 2,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint currencies_iso_code_uppercase check (iso_code = upper(iso_code)),
    constraint currencies_minor_unit_non_negative check (minor_unit >= 0)
);


comment on table public.currencies is 'Supported currencies for condominium accounting and display.';

alter table public.currencies enable row level security;

-- Allow authenticated users to read active currency catalog records.
drop policy if exists currencies_select_authenticated on public.currencies;
create policy currencies_select_authenticated
on public.currencies
for select
to authenticated
using (true);

drop trigger if exists trg_currencies_updated_at on public.currencies;
create trigger trg_currencies_updated_at
before update on public.currencies
for each row
execute function public.set_current_timestamp_updated_at();