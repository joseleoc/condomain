-- =========================================================================
-- Migration: Add chart_account_id to condominium_accounts
-- Purpose: Direct relationship between wallets and chart of accounts
-- Features: FK to chart_of_accounts, auto-populate existing rows
-- =========================================================================

-- =========================================================================
-- 1. ADD COLUMN
-- =========================================================================

alter table public.condominium_accounts
    add column chart_account_id uuid references public.chart_of_accounts(id) on delete set null;

comment on column public.condominium_accounts.chart_account_id is
    'Direct FK to chart_of_accounts. Maps wallet to its accounting entry.';


-- =========================================================================
-- 2. POPULATE EXISTING ROWS
-- =========================================================================

-- Auto-populate chart_account_id based on account_type mapping
update public.condominium_accounts ca
set chart_account_id = (
    select coa.id
    from public.chart_of_accounts coa
    where coa.condominium_id = ca.condominium_id
        and coa.code = case ca.account_type
            when 'bank' then '1.1.02'
            when 'cash' then '1.1.01'
            when 'wallet' then '1.1.01'
            when 'credit' then '2.1.01'
            when 'investment' then '1.1.02'
            else '1.1.02'  -- Fallback to bank account
        end
        and coa.type = case ca.account_type
            when 'credit' then 'liability'
            else 'asset'
        end
        and coa.deleted_at is null
    limit 1
)
where chart_account_id is null;


-- =========================================================================
-- 3. ADD INDEX
-- =========================================================================

create index if not exists idx_condominium_accounts_chart_account_id
    on public.condominium_accounts (chart_account_id)
    where chart_account_id is not null;


-- =========================================================================
-- 4. DOCUMENTATION
-- =========================================================================

comment on column public.condominium_accounts.chart_account_id is
    'Direct FK to chart_of_accounts. Maps wallet to its accounting entry. Auto-populated based on account_type.';
