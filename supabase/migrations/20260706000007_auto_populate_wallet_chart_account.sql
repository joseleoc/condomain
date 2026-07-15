-- =========================================================================
-- Migration: Auto-populate chart_account_id on wallet creation
-- Purpose: BEFORE INSERT trigger to automatically link new wallets to their
--          corresponding chart_of_accounts entry based on account_type.
-- Problem: Wallets created without chart_account_id cannot participate in
--          double-entry transactions (the accounting trigger rejects them).
-- =========================================================================

-- =========================================================================
-- 1. Create trigger function
-- =========================================================================

create or replace function public.auto_populate_wallet_chart_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Only auto-populate if chart_account_id was not explicitly provided
    if new.chart_account_id is null then
        select coa.id into new.chart_account_id
        from public.chart_of_accounts coa
        where coa.condominium_id = new.condominium_id
            and coa.code = case new.account_type
                when 'bank'      then '1.1.02'
                when 'cash'      then '1.1.01'
                when 'wallet'    then '1.1.01'
                when 'credit'    then '2.1.01'
                when 'investment' then '1.1.02'
                else '1.1.02'  -- Fallback to bank account
            end
            and coa.type = case new.account_type
                when 'credit' then 'liability'
                else 'asset'
            end
            and coa.deleted_at is null
        limit 1;

        -- If no matching chart account exists, raise a clear error
        if new.chart_account_id is null then
            raise exception 'Cannot create wallet: no chart_of_accounts entry found for account_type "%" in condominium %',
                new.account_type, new.condominium_id
                using hint = 'Ensure the condominium has been fully initialized (chart_of_accounts are auto-populated on condominium creation).';
        end if;
    end if;

    return new;
end;
$$;

comment on function public.auto_populate_wallet_chart_account() is
    'BEFORE INSERT trigger that auto-links wallets to chart_of_accounts based on account_type mapping.';


-- =========================================================================
-- 2. Create trigger
-- =========================================================================

drop trigger if exists trg_auto_populate_wallet_chart_account on public.condominium_accounts;

create trigger trg_auto_populate_wallet_chart_account
    before insert on public.condominium_accounts
    for each row
    execute function public.auto_populate_wallet_chart_account();


-- =========================================================================
-- 3. Backfill any existing wallets still missing chart_account_id
--    (covers wallets created between the column addition and this trigger)
-- =========================================================================

update public.condominium_accounts ca
set chart_account_id = (
    select coa.id
    from public.chart_of_accounts coa
    where coa.condominium_id = ca.condominium_id
        and coa.code = case ca.account_type
            when 'bank'      then '1.1.02'
            when 'cash'      then '1.1.01'
            when 'wallet'    then '1.1.01'
            when 'credit'    then '2.1.01'
            when 'investment' then '1.1.02'
            else '1.1.02'
        end
        and coa.type = case ca.account_type
            when 'credit' then 'liability'
            else 'asset'
        end
        and coa.deleted_at is null
    limit 1
)
where chart_account_id is null
    and deleted_at is null;
