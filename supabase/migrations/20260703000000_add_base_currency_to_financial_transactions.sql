-- =========================================================================
-- Migration: Add base_currency to financial_transactions
-- Purpose: Track which currency the base_amount is converted to
-- =========================================================================

-- =========================================================================
-- 1. ADD COLUMN
-- =========================================================================

alter table public.financial_transactions
    add column base_currency varchar(3) not null default 'USD'
    references public.currencies(iso_code);

comment on column public.financial_transactions.base_currency is 'Currency code for base_amount (snapshot at transaction time, immutable).';


-- =========================================================================
-- 2. POPULATE EXISTING ROWS
-- =========================================================================

-- Copy base_currency from condominiums.currency for existing transactions
update public.financial_transactions ft
set base_currency = c.currency
from public.condominiums c
where ft.condominium_id = c.id
  and ft.base_currency is null;


-- =========================================================================
-- 3. UPDATE RPC FUNCTIONS
-- =========================================================================

-- FUNCTION: insert_financial_transaction_idempotent (add base_currency)
create or replace function public.insert_financial_transaction_idempotent(
    p_idempotency_key text,
    p_id uuid,
    p_condominium_id uuid,
    p_account_id uuid,
    p_category_id uuid,
    p_transfer_group_id uuid,
    p_type text,
    p_status text,
    p_amount numeric,
    p_original_currency varchar,
    p_exchange_rate numeric,
    p_base_amount numeric,
    p_base_currency varchar,
    p_description text,
    p_reference_number text,
    p_transaction_date date,
    p_created_by uuid,
    p_created_at timestamptz,
    p_updated_at timestamptz
)
returns public.financial_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
    v_has_permission boolean;
    v_existing public.financial_transactions%rowtype;
    v_result public.financial_transactions%rowtype;
begin
    select exists (
        select 1
        from public.profile_condominiums pc
        join public.roles r on pc.role_id = r.id
        where pc.condominium_id = p_condominium_id
          and pc.profile_id = auth.uid()
          and pc.deleted_at is null
          and (r.name = 'condominium_admin' or r.name = 'admin_operator')
    ) into v_has_permission;

    if not v_has_permission then
        raise exception 'Insufficient permissions to create transaction';
    end if;

    -- Idempotency: return existing row if already processed
    select * into v_existing
    from public.financial_transactions
    where idempotency_key = p_idempotency_key
      and condominium_id = p_condominium_id
    limit 1;

    if found then
        return v_existing;
    end if;

    insert into public.financial_transactions (
        id,
        condominium_id,
        account_id,
        category_id,
        transfer_group_id,
        type,
        status,
        amount,
        original_currency,
        exchange_rate,
        base_amount,
        base_currency,
        description,
        reference_number,
        transaction_date,
        created_by,
        idempotency_key,
        created_at,
        updated_at
    )
    values (
        p_id,
        p_condominium_id,
        p_account_id,
        p_category_id,
        p_transfer_group_id,
        p_type,
        p_status,
        p_amount,
        p_original_currency,
        p_exchange_rate,
        p_base_amount,
        p_base_currency,
        p_description,
        p_reference_number,
        p_transaction_date,
        p_created_by,
        p_idempotency_key,
        p_created_at,
        p_updated_at
    )
    returning * into v_result;

    return v_result;
end;
$$;

-- FUNCTION: update_financial_transaction_idempotent (add base_currency)
create or replace function public.update_financial_transaction_idempotent(
    p_idempotency_key text,
    p_id uuid,
    p_condominium_id uuid,
    p_account_id uuid,
    p_category_id uuid,
    p_transfer_group_id uuid,
    p_type text,
    p_status text,
    p_amount numeric,
    p_original_currency varchar,
    p_exchange_rate numeric,
    p_base_amount numeric,
    p_base_currency varchar,
    p_description text,
    p_reference_number text,
    p_transaction_date date,
    p_created_by uuid,
    p_created_at timestamptz,
    p_updated_at timestamptz
)
returns public.financial_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
    v_has_permission boolean;
    v_existing public.financial_transactions%rowtype;
    v_result public.financial_transactions%rowtype;
begin
    select condominium_id into v_existing.condominium_id
    from public.financial_transactions
    where id = p_id and deleted_at is null;

    if not found then
        raise exception 'Transaction not found or deleted: %', p_id;
    end if;

    select exists (
        select 1
        from public.profile_condominiums pc
        join public.roles r on pc.role_id = r.id
        where pc.condominium_id = v_existing.condominium_id
          and pc.profile_id = auth.uid()
          and pc.deleted_at is null
          and (r.name = 'condominium_admin' or r.name = 'admin_operator')
    ) into v_has_permission;

    if not v_has_permission then
        raise exception 'Insufficient permissions to update transaction';
    end if;

    update public.financial_transactions
    set
        account_id = p_account_id,
        category_id = p_category_id,
        transfer_group_id = p_transfer_group_id,
        type = p_type,
        status = p_status,
        amount = p_amount,
        original_currency = p_original_currency,
        exchange_rate = p_exchange_rate,
        base_amount = p_base_amount,
        base_currency = p_base_currency,
        description = p_description,
        reference_number = p_reference_number,
        transaction_date = p_transaction_date,
        created_by = p_created_by,
        created_at = p_created_at,
        updated_at = p_updated_at,
        idempotency_key = p_idempotency_key
    where id = p_id
    returning * into v_result;

    return v_result;
end;
$$;


-- =========================================================================
-- 4. UPDATE GRANTS
-- =========================================================================

grant execute on function public.insert_financial_transaction_idempotent(text, uuid, uuid, uuid, uuid, uuid, text, text, numeric, varchar, numeric, numeric, varchar, text, text, date, uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.update_financial_transaction_idempotent(text, uuid, uuid, uuid, uuid, uuid, text, text, numeric, varchar, numeric, numeric, varchar, text, text, date, uuid, timestamptz, timestamptz) to authenticated;


-- =========================================================================
-- 5. DOCUMENTATION
-- =========================================================================

comment on function public.insert_financial_transaction_idempotent(text, uuid, uuid, uuid, uuid, uuid, text, text, numeric, varchar, numeric, numeric, varchar, text, text, date, uuid, timestamptz, timestamptz) is
    'Idempotently inserts a financial transaction with base_currency. Returns existing row if idempotency_key was already processed.';

comment on function public.update_financial_transaction_idempotent(text, uuid, uuid, uuid, uuid, uuid, text, text, numeric, varchar, numeric, numeric, varchar, text, text, date, uuid, timestamptz, timestamptz) is
    'Idempotently updates a financial transaction with base_currency. Enforces terminal-state and status-transition triggers.';
