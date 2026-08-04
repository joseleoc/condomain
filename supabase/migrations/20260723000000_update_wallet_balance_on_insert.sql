-- =========================================================================
-- Migration: Balance Update Trigger on Transaction Creation
-- Purpose: Update wallet balances when transactions are created with status='completed'
-- Features: handles INSERT operations for immediate balance updates
-- =========================================================================

-- =========================================================================
-- 1. FUNCTION: Update Wallet Balance on Insert
-- =========================================================================

create or replace function public.update_wallet_balance_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_balance_change numeric;
begin
    -- Only process transactions created with status='completed'
    if new.status != 'completed' then
        return new;
    end if;

    -- Calculate balance change based on transaction type
    case new.type
        when 'income' then
            -- Income increases wallet balance
            v_balance_change := new.base_amount;
        when 'expense' then
            -- Expense decreases wallet balance
            v_balance_change := -new.base_amount;
        when 'transfer' then
            -- For transfers, only the destination leg (income) increases balance
            -- The source leg (expense) decreases balance
            -- Both legs are handled separately, so we process both
            if new.account_id = (
                select account_id from public.financial_transactions
                where transfer_group_id = new.transfer_group_id
                    and type = 'income'
                    and deleted_at is null
                limit 1
            ) then
                -- This is the destination leg: increase balance
                v_balance_change := new.base_amount;
            else
                -- This is the source leg: decrease balance
                v_balance_change := -new.base_amount;
            end if;
        else
            raise exception 'Unknown transaction type: %', new.type;
    end case;

    -- Update wallet balance
    update public.condominium_accounts
    set current_balance = current_balance + v_balance_change,
        updated_at = now()
    where id = new.account_id
        and deleted_at is null;

    if not found then
        raise exception 'Wallet not found or deleted: %', new.account_id;
    end if;

    return new;
end;
$$;


-- =========================================================================
-- 2. TRIGGER: Execute on Insert with Status='completed'
-- =========================================================================

drop trigger if exists trg_update_wallet_balance_on_insert on public.financial_transactions;

create trigger trg_update_wallet_balance_on_insert
    after insert on public.financial_transactions
    for each row
    when (new.status = 'completed' and new.deleted_at is null)
    execute function public.update_wallet_balance_on_insert();

comment on function public.update_wallet_balance_on_insert() is
    'Updates wallet balance when transaction is created with status=completed.';

comment on trigger trg_update_wallet_balance_on_insert on public.financial_transactions is
    'Updates wallet balance after transaction creation with status=completed. Handles income, expense, and transfer types.';
