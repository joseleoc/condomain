-- =========================================================================
-- Migration: Accounting Engine Trigger (Server-Side Double-Entry)
-- Purpose: Automatically generate accounting entries when transactions are created
-- Features: atomic double-entry generation, balance updates, validation
-- =========================================================================

-- =========================================================================
-- 1. FUNCTION: Generate Accounting Entries
-- =========================================================================

create or replace function public.generate_accounting_entries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_wallet_account_id uuid;
    v_category_account_id uuid;
    v_destination_account_id uuid;
    v_wallet_account_type text;
    v_category_type text;
    v_other_leg record;
begin
    -- =========================================================================
    -- Step 1: Find the wallet's chart_of_accounts entry
    -- =========================================================================
    
    -- Get wallet account_type from condominium_accounts
    select account_type into v_wallet_account_type
    from public.condominium_accounts
    where id = new.account_id and deleted_at is null;

    if not found then
        raise exception 'Wallet not found: %', new.account_id;
    end if;

    -- Map wallet type to asset account code
    -- bank → 1.1.02, cash/wallet → 1.1.01, credit → 2.1.01, investment → 1.1.02
    case v_wallet_account_type
        when 'bank' then
            select id into v_wallet_account_id
            from public.chart_of_accounts
            where condominium_id = new.condominium_id
                and code = '1.1.02'
                and type = 'asset'
                and deleted_at is null
            limit 1;
        when 'cash', 'wallet' then
            select id into v_wallet_account_id
            from public.chart_of_accounts
            where condominium_id = new.condominium_id
                and code = '1.1.01'
                and type = 'asset'
                and deleted_at is null
            limit 1;
        when 'credit' then
            select id into v_wallet_account_id
            from public.chart_of_accounts
            where condominium_id = new.condominium_id
                and code = '2.1.01'
                and type = 'liability'
                and deleted_at is null
            limit 1;
        when 'investment' then
            select id into v_wallet_account_id
            from public.chart_of_accounts
            where condominium_id = new.condominium_id
                and code = '1.1.02'
                and type = 'asset'
                and deleted_at is null
            limit 1;
        else
            -- Fallback: find any asset account
            select id into v_wallet_account_id
            from public.chart_of_accounts
            where condominium_id = new.condominium_id
                and type = 'asset'
                and deleted_at is null
            limit 1;
    end case;

    if v_wallet_account_id is null then
        raise exception 'No chart_of_accounts entry found for wallet type: %', v_wallet_account_type;
    end if;

    -- =========================================================================
    -- Step 2: Generate entries based on transaction type
    -- =========================================================================

    case new.type
        when 'income' then
            -- Find category account
            if new.category_id is null then
                raise exception 'Category required for income transaction';
            end if;

            -- Try to find by system_account_id reference
            select id into v_category_account_id
            from public.chart_of_accounts
            where condominium_id = new.condominium_id
                and system_account_id = new.category_id
                and deleted_at is null
            limit 1;

            if v_category_account_id is null then
                -- Fallback: find by matching name
                select ca.id into v_category_account_id
                from public.chart_of_accounts ca
                join public.transaction_categories tc on tc.name = ca.name
                where tc.id = new.category_id
                    and ca.condominium_id = new.condominium_id
                    and ca.deleted_at is null
                limit 1;
            end if;

            if v_category_account_id is null then
                raise exception 'No chart_of_accounts entry found for category: %', new.category_id;
            end if;

            -- Debit: Asset account (wallet increases)
            insert into public.financial_transaction_entries (
                transaction_id, account_id, entry_type, amount
            ) values (
                new.id, v_wallet_account_id, 'debit', new.base_amount
            );

            -- Credit: Income account (category)
            insert into public.financial_transaction_entries (
                transaction_id, account_id, entry_type, amount
            ) values (
                new.id, v_category_account_id, 'credit', new.base_amount
            );

        when 'expense' then
            -- Find category account
            if new.category_id is null then
                raise exception 'Category required for expense transaction';
            end if;

            -- Try to find by system_account_id reference
            select id into v_category_account_id
            from public.chart_of_accounts
            where condominium_id = new.condominium_id
                and system_account_id = new.category_id
                and deleted_at is null
            limit 1;

            if v_category_account_id is null then
                -- Fallback: find by matching name
                select ca.id into v_category_account_id
                from public.chart_of_accounts ca
                join public.transaction_categories tc on tc.name = ca.name
                where tc.id = new.category_id
                    and ca.condominium_id = new.condominium_id
                    and ca.deleted_at is null
                limit 1;
            end if;

            if v_category_account_id is null then
                raise exception 'No chart_of_accounts entry found for category: %', new.category_id;
            end if;

            -- Debit: Expense account (category)
            insert into public.financial_transaction_entries (
                transaction_id, account_id, entry_type, amount
            ) values (
                new.id, v_category_account_id, 'debit', new.base_amount
            );

            -- Credit: Asset account (wallet decreases)
            insert into public.financial_transaction_entries (
                transaction_id, account_id, entry_type, amount
            ) values (
                new.id, v_wallet_account_id, 'credit', new.base_amount
            );

        when 'transfer' then
            -- For transfers, find the other leg to get destination account
            select account_id into v_other_leg
            from public.financial_transactions
            where transfer_group_id = new.transfer_group_id
                and id != new.id
                and deleted_at is null
            limit 1;

            if v_other_leg is null then
                -- This is the first leg; entries will be generated when second leg is created
                return new;
            end if;

            -- Find destination wallet's chart_of_accounts entry
            select account_type into v_wallet_account_type
            from public.condominium_accounts
            where id = v_other_leg.account_id and deleted_at is null;

            case v_wallet_account_type
                when 'bank' then
                    select id into v_destination_account_id
                    from public.chart_of_accounts
                    where condominium_id = new.condominium_id
                        and code = '1.1.02'
                        and type = 'asset'
                        and deleted_at is null
                    limit 1;
                when 'cash', 'wallet' then
                    select id into v_destination_account_id
                    from public.chart_of_accounts
                    where condominium_id = new.condominium_id
                        and code = '1.1.01'
                        and type = 'asset'
                        and deleted_at is null
                    limit 1;
                else
                    select id into v_destination_account_id
                    from public.chart_of_accounts
                    where condominium_id = new.condominium_id
                        and type = 'asset'
                        and deleted_at is null
                    limit 1;
            end case;

            if v_destination_account_id is null then
                raise exception 'No destination account found for transfer';
            end if;

            -- Determine if this is the source or destination leg
            if new.account_id = (
                select account_id from public.financial_transactions
                where transfer_group_id = new.transfer_group_id
                    and type = 'expense'
                    and deleted_at is null
                limit 1
            ) then
                -- This is the source leg (expense): Credit asset
                insert into public.financial_transaction_entries (
                    transaction_id, account_id, entry_type, amount
                ) values (
                    new.id, v_wallet_account_id, 'credit', new.base_amount
                );
            else
                -- This is the destination leg (income): Debit asset
                insert into public.financial_transaction_entries (
                    transaction_id, account_id, entry_type, amount
                ) values (
                    new.id, v_destination_account_id, 'debit', new.base_amount
                );
            end if;

        else
            raise exception 'Unknown transaction type: %', new.type;
    end case;

    -- =========================================================================
    -- Step 3: Validate double-entry balance
    -- =========================================================================
    
    declare
        v_total_debits numeric;
        v_total_credits numeric;
    begin
        select coalesce(sum(amount), 0) into v_total_debits
        from public.financial_transaction_entries
        where transaction_id = new.id and entry_type = 'debit';

        select coalesce(sum(amount), 0) into v_total_credits
        from public.financial_transaction_entries
        where transaction_id = new.id and entry_type = 'credit';

        if abs(v_total_debits - v_total_credits) > 0.01 then
            raise exception 'Double-entry validation failed: debits=%, credits=%', v_total_debits, v_total_credits;
        end if;

        if abs(v_total_debits - new.base_amount) > 0.01 then
            raise exception 'Entry amount mismatch: expected=%, actual=%', new.base_amount, v_total_debits;
        end if;
    end;

    return new;
end;
$$;


-- =========================================================================
-- 2. TRIGGER: Execute on Transaction Insert
-- =========================================================================

drop trigger if exists trg_generate_accounting_entries on public.financial_transactions;

create trigger trg_generate_accounting_entries
    after insert on public.financial_transactions
    for each row
    execute function public.generate_accounting_entries();

comment on function public.generate_accounting_entries() is
    'Automatically generates double-entry accounting entries when a financial transaction is created.';


-- =========================================================================
-- 3. DOCUMENTATION
-- =========================================================================

comment on trigger trg_generate_accounting_entries on public.financial_transactions is
    'Generates accounting entries automatically after transaction insert. Validates double-entry balance.';
