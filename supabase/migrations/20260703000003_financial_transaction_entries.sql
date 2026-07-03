-- =========================================================================
-- Migration: Financial Transaction Entries (Accounting Entries)
-- Table: financial_transaction_entries
-- Features: double-entry bookkeeping, RLS (read-only)
-- =========================================================================

-- =========================================================================
-- 1. TABLE CREATION
-- =========================================================================

create table if not exists public.financial_transaction_entries (
    id uuid primary key default gen_random_uuid(),
    transaction_id uuid not null references public.financial_transactions(id) on delete cascade,
    account_id uuid not null references public.chart_of_accounts(id) on delete restrict,
    entry_type varchar(6) not null,
    amount numeric(15, 2) not null,
    created_at timestamptz not null default now(),

    constraint financial_transaction_entries_entry_type_valid check (entry_type in ('debit', 'credit')),
    constraint financial_transaction_entries_amount_non_negative check (amount >= 0)
);

comment on table public.financial_transaction_entries is 'Double-entry accounting entries for financial transactions. Generated automatically by the system.';
comment on column public.financial_transaction_entries.transaction_id is 'FK to the financial transaction this entry belongs to.';
comment on column public.financial_transaction_entries.account_id is 'FK to the chart of accounts entry.';
comment on column public.financial_transaction_entries.entry_type is 'Entry type: debit or credit.';
comment on column public.financial_transaction_entries.amount is 'Entry amount in base currency. Always non-negative.';


-- =========================================================================
-- 2. INDEXES
-- =========================================================================

create index if not exists idx_fte_transaction_id
    on public.financial_transaction_entries (transaction_id);

create index if not exists idx_fte_account_id
    on public.financial_transaction_entries (account_id);


-- =========================================================================
-- 3. ROW LEVEL SECURITY
-- =========================================================================

alter table public.financial_transaction_entries enable row level security;

-- SELECT: Members can read entries for their condominium's transactions
drop policy if exists "Users can view transaction entries of their condominiums" on public.financial_transaction_entries;
create policy "Users can view transaction entries of their condominiums" on public.financial_transaction_entries
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.financial_transactions ft
            join public.profile_condominiums pc on pc.condominium_id = ft.condominium_id
            where ft.id = financial_transaction_entries.transaction_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
        )
    );

-- NOTE: No INSERT/UPDATE/DELETE policies for authenticated/anon roles.
-- Entries are generated automatically by the accounting engine, not by users.


-- =========================================================================
-- 4. GRANTS
-- =========================================================================

grant select on public.financial_transaction_entries to authenticated;
grant select on public.financial_transaction_entries to anon;
grant all on public.financial_transaction_entries to service_role;
