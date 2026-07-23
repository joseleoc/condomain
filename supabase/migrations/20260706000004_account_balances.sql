-- =========================================================================
-- Migration: Account Monthly and Annual Balances
-- Purpose: Track balance snapshots for financial reporting
-- Features: automatic balance updates, monthly/annual aggregation
-- =========================================================================

-- =========================================================================
-- 1. TABLE: account_monthly_balances
-- =========================================================================

create table if not exists public.account_monthly_balances (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references public.chart_of_accounts(id) on delete cascade,
    year int not null,
    month int not null,
    opening_balance numeric(15, 2) not null default 0.00,
    total_debits numeric(15, 2) not null default 0.00,
    total_credits numeric(15, 2) not null default 0.00,
    closing_balance numeric(15, 2) not null default 0.00,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint account_monthly_balances_unique unique (account_id, year, month),
    constraint account_monthly_balances_month_check check (month between 1 and 12),
    constraint account_monthly_balances_year_check check (year >= 2020)
);

comment on table public.account_monthly_balances is 'Monthly balance snapshots for chart of accounts. Used for financial reporting.';
comment on column public.account_monthly_balances.account_id is 'FK to chart_of_accounts.';
comment on column public.account_monthly_balances.year is 'Fiscal year.';
comment on column public.account_monthly_balances.month is 'Month (1-12).';
comment on column public.account_monthly_balances.opening_balance is 'Balance at start of month.';
comment on column public.account_monthly_balances.total_debits is 'Sum of all debit entries for the month.';
comment on column public.account_monthly_balances.total_credits is 'Sum of all credit entries for the month.';
comment on column public.account_monthly_balances.closing_balance is 'Balance at end of month (opening + debits - credits).';


-- =========================================================================
-- 2. TABLE: account_annual_balances
-- =========================================================================

create table if not exists public.account_annual_balances (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references public.chart_of_accounts(id) on delete cascade,
    year int not null,
    opening_balance numeric(15, 2) not null default 0.00,
    total_debits numeric(15, 2) not null default 0.00,
    total_credits numeric(15, 2) not null default 0.00,
    closing_balance numeric(15, 2) not null default 0.00,
    is_closed boolean not null default false,
    closed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint account_annual_balances_unique unique (account_id, year),
    constraint account_annual_balances_year_check check (year >= 2020)
);

comment on table public.account_annual_balances is 'Annual balance snapshots for chart of accounts. Used for year-end financial statements.';
comment on column public.account_annual_balances.is_closed is 'TRUE when fiscal year is closed (no more modifications allowed).';
comment on column public.account_annual_balances.closed_at is 'Timestamp when fiscal year was closed.';


-- =========================================================================
-- 3. INDEXES
-- =========================================================================

create index if not exists idx_monthly_balances_account
    on public.account_monthly_balances (account_id);

create index if not exists idx_monthly_balances_period
    on public.account_monthly_balances (year, month);

create index if not exists idx_annual_balances_account
    on public.account_annual_balances (account_id);

create index if not exists idx_annual_balances_year
    on public.account_annual_balances (year);


-- =========================================================================
-- 4. TRIGGER: Update Monthly Balance on Entry Insert
-- =========================================================================

create or replace function public.update_monthly_balance_on_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_year int;
    v_month int;
    v_opening_balance numeric(15, 2);
    v_closing_balance numeric(15, 2);
begin
    -- Get transaction date from the linked transaction
    select extract(year from ft.transaction_date)::int,
           extract(month from ft.transaction_date)::int
    into v_year, v_month
    from public.financial_transactions ft
    where ft.id = new.transaction_id;

    if v_year is null or v_month is null then
        raise exception 'Transaction not found for entry: %', new.transaction_id;
    end if;

    -- Upsert monthly balance record
    insert into public.account_monthly_balances (
        account_id, year, month, opening_balance, total_debits, total_credits, closing_balance
    )
    values (
        new.account_id, v_year, v_month, 0.00, 0.00, 0.00, 0.00
    )
    on conflict (account_id, year, month) do nothing;

    -- Update totals based on entry type
    if new.entry_type = 'debit' then
        update public.account_monthly_balances
        set total_debits = total_debits + new.amount,
            closing_balance = opening_balance + (total_debits + new.amount) - total_credits,
            updated_at = now()
        where account_id = new.account_id
            and year = v_year
            and month = v_month;
    else
        update public.account_monthly_balances
        set total_credits = total_credits + new.amount,
            closing_balance = opening_balance + total_debits - (total_credits + new.amount),
            updated_at = now()
        where account_id = new.account_id
            and year = v_year
            and month = v_month;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_update_monthly_balance on public.financial_transaction_entries;

create trigger trg_update_monthly_balance
    after insert on public.financial_transaction_entries
    for each row
    execute function public.update_monthly_balance_on_entry();


-- =========================================================================
-- 5. TRIGGER: Update Annual Balance from Monthly
-- =========================================================================

create or replace function public.update_annual_balance_from_monthly()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Upsert annual balance record
    insert into public.account_annual_balances (
        account_id, year, opening_balance, total_debits, total_credits, closing_balance
    )
    values (
        new.account_id, new.year, 0.00, 0.00, 0.00, 0.00
    )
    on conflict (account_id, year) do nothing;

    -- Recalculate annual totals from all monthly balances
    update public.account_annual_balances
    set total_debits = (
            select coalesce(sum(total_debits), 0)
            from public.account_monthly_balances
            where account_id = new.account_id and year = new.year
        ),
        total_credits = (
            select coalesce(sum(total_credits), 0)
            from public.account_monthly_balances
            where account_id = new.account_id and year = new.year
        ),
        closing_balance = (
            select coalesce(sum(closing_balance), 0)
            from public.account_monthly_balances
            where account_id = new.account_id and year = new.year
        ),
        updated_at = now()
    where account_id = new.account_id
        and year = new.year;

    return new;
end;
$$;

drop trigger if exists trg_update_annual_balance on public.account_monthly_balances;

create trigger trg_update_annual_balance
    after insert or update on public.account_monthly_balances
    for each row
    execute function public.update_annual_balance_from_monthly();


-- =========================================================================
-- 6. RLS
-- =========================================================================

alter table public.account_monthly_balances enable row level security;
alter table public.account_annual_balances enable row level security;

-- Monthly balances: read for members
drop policy if exists "Users can view monthly balances of their condominiums" on public.account_monthly_balances;
create policy "Users can view monthly balances of their condominiums" on public.account_monthly_balances
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.chart_of_accounts coa
            join public.profile_condominiums pc on pc.condominium_id = coa.condominium_id
            where coa.id = account_monthly_balances.account_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
        )
    );

-- Annual balances: read for members
drop policy if exists "Users can view annual balances of their condominiums" on public.account_annual_balances;
create policy "Users can view annual balances of their condominiums" on public.account_annual_balances
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.chart_of_accounts coa
            join public.profile_condominiums pc on pc.condominium_id = coa.condominium_id
            where coa.id = account_annual_balances.account_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
        )
    );


-- =========================================================================
-- 7. GRANTS
-- =========================================================================

grant select on public.account_monthly_balances to authenticated;
grant select on public.account_annual_balances to authenticated;
grant all on public.account_monthly_balances to service_role;
grant all on public.account_annual_balances to service_role;


-- =========================================================================
-- 8. DOCUMENTATION
-- =========================================================================

comment on function public.update_monthly_balance_on_entry() is
    'Automatically updates monthly balance snapshots when accounting entries are created.';

comment on function public.update_annual_balance_from_monthly() is
    'Automatically aggregates monthly balances into annual balance snapshots.';
