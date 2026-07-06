-- =========================================================================
-- Migration: Balance Update Trigger on Transaction Approval
-- Purpose: Automatically update wallet balances when transactions are approved
-- Features: atomic balance updates, validation, audit trail
-- =========================================================================

-- =========================================================================
-- 1. FUNCTION: Update Wallet Balance
-- =========================================================================

create or replace function public.update_wallet_balance_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_balance_change numeric;
begin
    -- Only process status changes to 'completed'
    if new.status != 'completed' or old.status = new.status then
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
-- 2. TRIGGER: Execute on Status Change to 'completed'
-- =========================================================================

drop trigger if exists trg_update_wallet_balance_on_approval on public.financial_transactions;

create trigger trg_update_wallet_balance_on_approval
    after update of status on public.financial_transactions
    for each row
    when (new.status = 'completed' and old.status != 'completed')
    execute function public.update_wallet_balance_on_approval();

comment on function public.update_wallet_balance_on_approval() is
    'Automatically updates wallet balance when transaction status changes to completed.';


-- =========================================================================
-- 3. DOCUMENTATION
-- =========================================================================

comment on trigger trg_update_wallet_balance_on_approval on public.financial_transactions is
    'Updates wallet balance after transaction approval (pending → completed). Handles income, expense, and transfer types.';
