-- =========================================================================
-- Migration: Link Transaction Categories to Chart of Accounts
-- Purpose: Add direct FK from transaction_categories to chart_of_accounts
--          to fix the broken category->account mapping in the accounting trigger
-- =========================================================================

-- =========================================================================
-- 1. Add chart_account_id column to transaction_categories
-- =========================================================================

alter table public.transaction_categories
    add column if not exists chart_account_id uuid references public.chart_of_accounts(id) on delete set null;

comment on column public.transaction_categories.chart_account_id is 
    'Direct FK to chart_of_accounts. Maps transaction category to its accounting entry.';

create index if not exists idx_transaction_categories_chart_account_id
    on public.transaction_categories(chart_account_id)
    where deleted_at is null;

-- =========================================================================
-- 2. Backfill existing system categories with chart_account_id mapping
-- =========================================================================

-- Map expense categories to their corresponding chart accounts
-- services_electricity -> 5.1.01 Electricidad
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'services_electricity'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '5.1.01'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- services_water -> 5.1.02 Agua
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'services_water'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '5.1.02'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- services_gas -> 5.1.03 Gas
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'services_gas'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '5.1.03'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- maintenance_common_areas -> 5.2 Mantenimiento (parent account)
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'maintenance_common_areas'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '5.2'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- maintenance_repairs -> 5.2 Mantenimiento (parent account)
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'maintenance_repairs'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '5.2'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- administration_fees -> 5.3 Administración
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'administration_fees'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '5.3'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- administration_salaries -> 5.3 Administración
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'administration_salaries'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '5.3'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- Map income categories to their corresponding chart accounts
-- fees_monthly -> 4.1.01 Alícuotas de Condominio
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'fees_monthly'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '4.1.01'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- fees_extraordinary -> 4.2.01 Cuotas Extraordinarias
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'fees_extraordinary'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '4.2.01'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- reserves -> 2.1.01 Fondo de Reserva (liability account for reserve fund)
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'reserves'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '2.1.01'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- other_income -> 4.2 Ingresos Extraordinarios (parent account)
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'other_income'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '4.2'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- Map parent/root categories to their parent chart accounts
-- services -> 5.1 Servicios Públicos
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'services'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '5.1'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- maintenance -> 5.2 Mantenimiento
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'maintenance'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '5.2'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- administration -> 5.3 Administración
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'administration'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '5.3'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- fees -> 4.1 Ingresos Ordinarios
update public.transaction_categories tc
set chart_account_id = coa.id
from public.chart_of_accounts coa
join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
where tc.name = 'fees'
    and tc.is_system = true
    and tc.deleted_at is null
    and cas.code = '4.1'
    and coa.condominium_id = tc.condominium_id
    and coa.deleted_at is null;

-- =========================================================================
-- 3. Update seed_system_categories() to set chart_account_id for new condos
-- =========================================================================

create or replace function public.seed_system_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_condominium_id uuid := new.id;
begin
    -- Expense root categories
    insert into public.transaction_categories
        (condominium_id, name, category_type, is_system, i18n_key, chart_account_id)
    values
        (v_condominium_id, 'maintenance', 'expense', true, 'maintenance',
            (select coa.id from public.chart_of_accounts coa 
             join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
             where coa.condominium_id = v_condominium_id and cas.code = '5.2' and coa.deleted_at is null limit 1)),
        (v_condominium_id, 'services', 'expense', true, 'services',
            (select coa.id from public.chart_of_accounts coa 
             join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
             where coa.condominium_id = v_condominium_id and cas.code = '5.1' and coa.deleted_at is null limit 1)),
        (v_condominium_id, 'administration', 'expense', true, 'administration',
            (select coa.id from public.chart_of_accounts coa 
             join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
             where coa.condominium_id = v_condominium_id and cas.code = '5.3' and coa.deleted_at is null limit 1)),
        (v_condominium_id, 'security', 'expense', true, 'security',
            (select coa.id from public.chart_of_accounts coa 
             join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
             where coa.condominium_id = v_condominium_id and cas.code = '5.3' and coa.deleted_at is null limit 1)),
        (v_condominium_id, 'cleaning', 'expense', true, 'cleaning',
            (select coa.id from public.chart_of_accounts coa 
             join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
             where coa.condominium_id = v_condominium_id and cas.code = '5.3' and coa.deleted_at is null limit 1))
    on conflict do nothing;

    -- Income root categories
    insert into public.transaction_categories
        (condominium_id, name, category_type, is_system, i18n_key, chart_account_id)
    values
        (v_condominium_id, 'fees', 'income', true, 'fees',
            (select coa.id from public.chart_of_accounts coa 
             join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
             where coa.condominium_id = v_condominium_id and cas.code = '4.1' and coa.deleted_at is null limit 1)),
        (v_condominium_id, 'reserves', 'income', true, 'reserves',
            (select coa.id from public.chart_of_accounts coa 
             join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
             where coa.condominium_id = v_condominium_id and cas.code = '2.1.01' and coa.deleted_at is null limit 1)),
        (v_condominium_id, 'other_income', 'income', true, 'other_income',
            (select coa.id from public.chart_of_accounts coa 
             join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
             where coa.condominium_id = v_condominium_id and cas.code = '4.2' and coa.deleted_at is null limit 1))
    on conflict do nothing;

    -- Expense children: maintenance
    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'maintenance_common_areas', 'expense', true, 'maintenance_common_areas',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '5.2' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'maintenance' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'maintenance_repairs', 'expense', true, 'maintenance_repairs',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '5.2' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'maintenance' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    -- Expense children: services
    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'services_electricity', 'expense', true, 'services_electricity',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '5.1.01' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'services_water', 'expense', true, 'services_water',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '5.1.02' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'services_gas', 'expense', true, 'services_gas',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '5.1.03' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'services_internet', 'expense', true, 'services_internet',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '5.1' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'services_phone', 'expense', true, 'services_phone',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '5.1' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'services_waste', 'expense', true, 'services_waste',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '5.1' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    -- Expense children: administration
    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'administration_fees', 'expense', true, 'administration_fees',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '5.3' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'administration' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'administration_salaries', 'expense', true, 'administration_salaries',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '5.3' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'administration' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    -- Income children: fees
    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'fees_monthly', 'income', true, 'fees_monthly',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '4.1.01' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'fees' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key, chart_account_id)
    select v_condominium_id, p.id, 'fees_extraordinary', 'income', true, 'fees_extraordinary',
        (select coa.id from public.chart_of_accounts coa 
         join public.chart_of_accounts_system cas on coa.system_account_id = cas.id
         where coa.condominium_id = v_condominium_id and cas.code = '4.2.01' and coa.deleted_at is null limit 1)
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'fees' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    return new;
end;
$$;

-- =========================================================================
-- 4. Fix generate_accounting_entries() to use direct FK lookup
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
    v_other_leg record;
begin
    -- =========================================================================
    -- Step 1: Get wallet's chart_of_accounts entry (direct FK lookup)
    -- =========================================================================
    
    select chart_account_id into v_wallet_account_id
    from public.condominium_accounts
    where id = new.account_id and deleted_at is null;

    if v_wallet_account_id is null then
        raise exception 'Wallet has no chart_account_id assigned. Please assign a chart account to wallet: %', new.account_id;
    end if;

    -- =========================================================================
    -- Step 2: Generate entries based on transaction type
    -- =========================================================================

    case new.type
        when 'income' then
            -- Find category account via direct FK
            if new.category_id is null then
                raise exception 'Category required for income transaction';
            end if;

            select chart_account_id into v_category_account_id
            from public.transaction_categories
            where id = new.category_id and deleted_at is null;

            if v_category_account_id is null then
                raise exception 'Category has no chart_account_id assigned. Please assign a chart account to category: %', new.category_id;
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
            -- Find category account via direct FK
            if new.category_id is null then
                raise exception 'Category required for expense transaction';
            end if;

            select chart_account_id into v_category_account_id
            from public.transaction_categories
            where id = new.category_id and deleted_at is null;

            if v_category_account_id is null then
                raise exception 'Category has no chart_account_id assigned. Please assign a chart account to category: %', new.category_id;
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

            -- Get destination wallet's chart_account_id directly
            select chart_account_id into v_destination_account_id
            from public.condominium_accounts
            where id = v_other_leg.account_id and deleted_at is null;

            if v_destination_account_id is null then
                raise exception 'Destination wallet has no chart_account_id assigned';
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

comment on function public.generate_accounting_entries() is
    'Automatically generates double-entry accounting entries when a financial transaction is created. Uses direct FK from transaction_categories to chart_of_accounts.';

-- =========================================================================
-- 5. Documentation
-- =========================================================================

comment on table public.transaction_categories is 
    'Income and expense categories for classifying financial transactions. Each category maps to a chart_of_accounts entry for double-entry accounting.';
