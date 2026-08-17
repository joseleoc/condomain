-- =========================================================================
-- Migration: Fix Monthly Balance Status Check
-- Purpose: Monthly/annual balances should only reflect completed transactions.
--   Previously, balances were updated when entries were created (pending),
--   causing inconsistency with wallet current_balance which only updates
--   on approval (status → completed).
-- Changes:
--   1. Guard update_monthly_balance_on_entry() to skip pending transactions
--   2. Add trigger on status change to 'completed' that processes entries
-- =========================================================================

-- =========================================================================
-- 1. REPLACE FUNCTION: Guard entry insert with status check
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
    v_status text;
begin
    -- Get transaction date and status from the linked transaction
    select extract(year from ft.transaction_date)::int,
           extract(month from ft.transaction_date)::int,
           ft.status
    into v_year, v_month, v_status
    from public.financial_transactions ft
    where ft.id = new.transaction_id;

    if v_year is null or v_month is null then
        raise exception 'Transaction not found for entry: %', new.transaction_id;
    end if;

    -- Only update balances for completed transactions.
    -- Pending/voided transactions must not affect reported balances.
    if v_status != 'completed' then
        return new;
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


-- =========================================================================
-- 2. NEW FUNCTION: Update monthly balances when transaction is approved
-- =========================================================================

create or replace function public.update_monthly_balance_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_entry record;
    v_year int;
    v_month int;
begin
    -- Only process when status changes to 'completed'
    if new.status != 'completed' or old.status = 'completed' then
        return new;
    end if;

    -- Get transaction date
    select extract(year from new.transaction_date)::int,
           extract(month from new.transaction_date)::int
    into v_year, v_month;

    -- Process all accounting entries for this transaction
    for v_entry in
        select * from public.financial_transaction_entries
        where transaction_id = new.id
    loop
        -- Upsert monthly balance record
        insert into public.account_monthly_balances (
            account_id, year, month, opening_balance, total_debits, total_credits, closing_balance
        )
        values (
            v_entry.account_id, v_year, v_month, 0.00, 0.00, 0.00, 0.00
        )
        on conflict (account_id, year, month) do nothing;

        -- Update totals based on entry type
        if v_entry.entry_type = 'debit' then
            update public.account_monthly_balances
            set total_debits = total_debits + v_entry.amount,
                closing_balance = opening_balance + (total_debits + v_entry.amount) - total_credits,
                updated_at = now()
            where account_id = v_entry.account_id
                and year = v_year
                and month = v_month;
        else
            update public.account_monthly_balances
            set total_credits = total_credits + v_entry.amount,
                closing_balance = opening_balance + total_debits - (total_credits + v_entry.amount),
                updated_at = now()
            where account_id = v_entry.account_id
                and year = v_year
                and month = v_month;
        end if;
    end loop;

    return new;
end;
$$;


-- =========================================================================
-- 3. TRIGGER: Execute on Transaction Approval
-- =========================================================================

drop trigger if exists trg_update_monthly_balance_on_approval on public.financial_transactions;

create trigger trg_update_monthly_balance_on_approval
    after update of status on public.financial_transactions
    for each row
    when (new.status = 'completed' and old.status != 'completed')
    execute function public.update_monthly_balance_on_approval();

comment on trigger trg_update_monthly_balance_on_approval on public.financial_transactions is
    'Updates monthly/annual balance snapshots when a transaction is approved (pending → completed).';


-- =========================================================================
-- 4. DOCUMENTATION
-- =========================================================================

comment on function public.update_monthly_balance_on_entry() is
    'Updates monthly balance snapshots when accounting entries are created. Only processes entries belonging to completed transactions.';

comment on function public.update_monthly_balance_on_approval() is
    'Processes accounting entries for a transaction when it transitions to completed, updating monthly and annual balance snapshots.';
