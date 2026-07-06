-- =========================================================================
-- Migration: Exchange Rates and Bank Reconciliation
-- Purpose: Multi-currency support and bank statement reconciliation
-- Features: exchange rate tracking, reconciliation matching
-- =========================================================================

-- =========================================================================
-- 1. TABLE: exchange_rates
-- =========================================================================

create table if not exists public.exchange_rates (
    id uuid primary key default gen_random_uuid(),
    condominium_id uuid not null references public.condominiums(id) on delete cascade,
    from_currency varchar(3) not null references public.currencies(iso_code),
    to_currency varchar(3) not null references public.currencies(iso_code),
    rate numeric(14, 4) not null,
    effective_date date not null,
    source text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint exchange_rates_unique unique (condominium_id, from_currency, to_currency, effective_date),
    constraint exchange_rates_rate_check check (rate > 0),
    constraint exchange_rates_different_currencies check (from_currency != to_currency)
);

comment on table public.exchange_rates is 'Exchange rates for multi-currency transactions. Tracks rates over time for historical accuracy.';
comment on column public.exchange_rates.from_currency is 'Source currency (e.g., USD).';
comment on column public.exchange_rates.to_currency is 'Target currency (e.g., VES).';
comment on column public.exchange_rates.rate is 'Exchange rate (e.g., 1 USD = 36.5 VES).';
comment on column public.exchange_rates.effective_date is 'Date when this rate is effective.';
comment on column public.exchange_rates.source is 'Source of the rate (manual, API, bank).';


-- =========================================================================
-- 2. TABLE: bank_reconciliations
-- =========================================================================

create table if not exists public.bank_reconciliations (
    id uuid primary key default gen_random_uuid(),
    condominium_id uuid not null references public.condominiums(id) on delete cascade,
    account_id uuid not null references public.condominium_accounts(id) on delete cascade,
    statement_date date not null,
    statement_balance numeric(15, 2) not null,
    reconciled_balance numeric(15, 2) not null,
    difference numeric(15, 2) not null default 0.00,
    status text not null default 'pending',
    reconciled_by uuid references public.profiles(id) on delete set null,
    reconciled_at timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint bank_reconciliations_status_check check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
    constraint bank_reconciliations_balance_check check (statement_balance >= 0)
);

comment on table public.bank_reconciliations is 'Bank reconciliation records. Matches system transactions with bank statement entries.';
comment on column public.bank_reconciliations.statement_date is 'Date of the bank statement.';
comment on column public.bank_reconciliations.statement_balance is 'Balance shown on bank statement.';
comment on column public.bank_reconciliations.reconciled_balance is 'Balance calculated from system transactions.';
comment on column public.bank_reconciliations.difference is 'Difference between statement and system balances.';
comment on column public.bank_reconciliations.status is 'Reconciliation status: pending, in_progress, completed, cancelled.';


-- =========================================================================
-- 3. TABLE: bank_reconciliation_items
-- =========================================================================

create table if not exists public.bank_reconciliation_items (
    id uuid primary key default gen_random_uuid(),
    reconciliation_id uuid not null references public.bank_reconciliations(id) on delete cascade,
    transaction_id uuid references public.financial_transactions(id) on delete set null,
    statement_reference text,
    statement_date date,
    statement_amount numeric(15, 2),
    match_status text not null default 'unmatched',
    notes text,
    created_at timestamptz not null default now(),

    constraint bank_reconciliation_items_match_status_check check (match_status in ('unmatched', 'matched', 'cleared', 'exception'))
);

comment on table public.bank_reconciliation_items is 'Individual line items in a bank reconciliation. Links system transactions to bank statement entries.';
comment on column public.bank_reconciliation_items.statement_reference is 'Reference number from bank statement.';
comment on column public.bank_reconciliation_items.statement_date is 'Date from bank statement.';
comment on column public.bank_reconciliation_items.statement_amount is 'Amount from bank statement.';
comment on column public.bank_reconciliation_items.match_status is 'Match status: unmatched, matched, cleared, exception.';


-- =========================================================================
-- 4. INDEXES
-- =========================================================================

create index if not exists idx_exchange_rates_condo
    on public.exchange_rates (condominium_id);

create index if not exists idx_exchange_rates_currencies
    on public.exchange_rates (from_currency, to_currency);

create index if not exists idx_exchange_rates_effective_date
    on public.exchange_rates (effective_date desc);

create index if not exists idx_bank_reconciliations_condo
    on public.bank_reconciliations (condominium_id);

create index if not exists idx_bank_reconciliations_account
    on public.bank_reconciliations (account_id);

create index if not exists idx_bank_reconciliations_status
    on public.bank_reconciliations (status)
    where status != 'completed';

create index if not exists idx_reconciliation_items_reconciliation
    on public.bank_reconciliation_items (reconciliation_id);

create index if not exists idx_reconciliation_items_transaction
    on public.bank_reconciliation_items (transaction_id)
    where transaction_id is not null;


-- =========================================================================
-- 5. RLS
-- =========================================================================

alter table public.exchange_rates enable row level security;
alter table public.bank_reconciliations enable row level security;
alter table public.bank_reconciliation_items enable row level security;

-- Exchange rates: read for members, CUD for admin/operator
drop policy if exists "Users can view exchange rates of their condominiums" on public.exchange_rates;
create policy "Users can view exchange rates of their condominiums" on public.exchange_rates
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.profile_condominiums pc
            where pc.condominium_id = exchange_rates.condominium_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
        )
    );

drop policy if exists "Admins can manage exchange rates" on public.exchange_rates;
create policy "Admins can manage exchange rates" on public.exchange_rates
    for all
    to authenticated
    using (
        exists (
            select 1
            from public.profile_condominiums pc
            join public.roles r on pc.role_id = r.id
            where pc.condominium_id = exchange_rates.condominium_id
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
            where pc.condominium_id = exchange_rates.condominium_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
                and (r.name = 'condominium_admin' or r.name = 'admin_operator')
        )
    );

-- Bank reconciliations: read for members, CUD for admin/operator
drop policy if exists "Users can view bank reconciliations of their condominiums" on public.bank_reconciliations;
create policy "Users can view bank reconciliations of their condominiums" on public.bank_reconciliations
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.profile_condominiums pc
            where pc.condominium_id = bank_reconciliations.condominium_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
        )
    );

drop policy if exists "Admins can manage bank reconciliations" on public.bank_reconciliations;
create policy "Admins can manage bank reconciliations" on public.bank_reconciliations
    for all
    to authenticated
    using (
        exists (
            select 1
            from public.profile_condominiums pc
            join public.roles r on pc.role_id = r.id
            where pc.condominium_id = bank_reconciliations.condominium_id
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
            where pc.condominium_id = bank_reconciliations.condominium_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
                and (r.name = 'condominium_admin' or r.name = 'admin_operator')
        )
    );

-- Bank reconciliation items: same as reconciliations
drop policy if exists "Users can view reconciliation items of their condominiums" on public.bank_reconciliation_items;
create policy "Users can view reconciliation items of their condominiums" on public.bank_reconciliation_items
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.bank_reconciliations br
            join public.profile_condominiums pc on pc.condominium_id = br.condominium_id
            where br.id = bank_reconciliation_items.reconciliation_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
        )
    );

drop policy if exists "Admins can manage reconciliation items" on public.bank_reconciliation_items;
create policy "Admins can manage reconciliation items" on public.bank_reconciliation_items
    for all
    to authenticated
    using (
        exists (
            select 1
            from public.bank_reconciliations br
            join public.profile_condominiums pc on pc.condominium_id = br.condominium_id
            join public.roles r on pc.role_id = r.id
            where br.id = bank_reconciliation_items.reconciliation_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
                and (r.name = 'condominium_admin' or r.name = 'admin_operator')
        )
    )
    with check (
        exists (
            select 1
            from public.bank_reconciliations br
            join public.profile_condominiums pc on pc.condominium_id = br.condominium_id
            join public.roles r on pc.role_id = r.id
            where br.id = bank_reconciliation_items.reconciliation_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
                and (r.name = 'condominium_admin' or r.name = 'admin_operator')
        )
    );


-- =========================================================================
-- 6. GRANTS
-- =========================================================================

grant select on public.exchange_rates to authenticated;
grant insert, update, delete on public.exchange_rates to authenticated;
grant all on public.exchange_rates to service_role;

grant select on public.bank_reconciliations to authenticated;
grant insert, update, delete on public.bank_reconciliations to authenticated;
grant all on public.bank_reconciliations to service_role;

grant select on public.bank_reconciliation_items to authenticated;
grant insert, update, delete on public.bank_reconciliation_items to authenticated;
grant all on public.bank_reconciliation_items to service_role;


-- =========================================================================
-- 7. DOCUMENTATION
-- =========================================================================

comment on table public.exchange_rates is 'Exchange rates for multi-currency transactions. Tracks rates over time for historical accuracy.';
comment on table public.bank_reconciliations is 'Bank reconciliation records. Matches system transactions with bank statement entries.';
comment on table public.bank_reconciliation_items is 'Individual line items in a bank reconciliation. Links system transactions to bank statement entries.';
