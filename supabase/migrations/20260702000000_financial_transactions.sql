-- =========================================================================
-- Migration: Basic Financial Transactions (Phase 2)
-- Table: financial_transactions
-- Features: indexes, RLS, status-transition trigger, terminal-state guard,
--           soft-delete RPC, idempotent sync RPCs
-- =========================================================================

-- =========================================================================
-- 1. TABLE CREATION
-- =========================================================================

create table if not exists public.financial_transactions (
    id uuid primary key default gen_random_uuid(),
    condominium_id uuid not null references public.condominiums(id) on delete cascade,
    account_id uuid not null references public.condominium_accounts(id) on delete restrict,
    category_id uuid references public.transaction_categories(id) on delete restrict,
    transfer_group_id uuid,
    type text not null,
    status text not null default 'pending',
    amount numeric(15, 2) not null,
    original_currency varchar(3) not null references public.currencies(iso_code),
    exchange_rate numeric(14, 4) not null default 1.0000,
    base_amount numeric(15, 2) not null,
    description text not null,
    reference_number text,
    transaction_date date not null,
    created_by uuid not null references public.profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,

    constraint financial_transactions_type_valid check (type in ('income', 'expense', 'transfer')),
    constraint financial_transactions_status_valid check (status in ('pending', 'completed', 'voided')),
    constraint financial_transactions_amount_positive check (amount > 0),
    constraint financial_transactions_exchange_rate_positive check (exchange_rate > 0)
);

comment on table public.financial_transactions is 'Income, expense, and transfer transactions for a condominium.';
comment on column public.financial_transactions.type is 'Transaction direction: income, expense, or transfer.';
comment on column public.financial_transactions.status is 'Lifecycle state: pending, completed, or voided.';
comment on column public.financial_transactions.base_amount is 'Denormalized amount in base currency: amount * exchange_rate.';
comment on column public.financial_transactions.transfer_group_id is 'Links the two legs of a transfer (expense from source, income to destination).';


-- =========================================================================
-- 2. AUTOMATED TIMESTAMP TRIGGER
-- =========================================================================

create trigger trg_financial_transactions_updated_at
    before update on public.financial_transactions
    for each row
    execute function public.set_current_timestamp_updated_at();


-- =========================================================================
-- 3. INDEXES
-- =========================================================================

create unique index if not exists financial_transactions_reference_unique_active
    on public.financial_transactions (condominium_id, reference_number)
    where deleted_at is null and reference_number is not null;

create index if not exists idx_ft_condo_date_active
    on public.financial_transactions (condominium_id, transaction_date desc)
    where deleted_at is null;

create index if not exists idx_ft_account_date_active
    on public.financial_transactions (account_id, transaction_date desc)
    where deleted_at is null;

create index if not exists idx_ft_category_date_active
    on public.financial_transactions (category_id, transaction_date desc)
    where deleted_at is null and category_id is not null;

create index if not exists idx_ft_status_pending_active
    on public.financial_transactions (status)
    where status = 'pending' and deleted_at is null;


-- =========================================================================
-- 4. ROW LEVEL SECURITY
-- =========================================================================

alter table public.financial_transactions enable row level security;

-- financial_transactions: SELECT for members
drop policy if exists "Users can view transactions of their condominiums" on public.financial_transactions;
create policy "Users can view transactions of their condominiums" on public.financial_transactions
for select
using (
    deleted_at is null
    and exists (
        select 1
        from public.profile_condominiums pc
        where pc.condominium_id = public.financial_transactions.condominium_id
          and pc.profile_id = auth.uid()
          and pc.deleted_at is null
    )
);

-- financial_transactions: INSERT/UPDATE/DELETE for admin/operator
drop policy if exists "Admins and Operators can manage transactions" on public.financial_transactions;
create policy "Admins and Operators can manage transactions" on public.financial_transactions
for all
using (
    deleted_at is null
    and exists (
        select 1
        from public.profile_condominiums pc
        join public.roles r on pc.role_id = r.id
        where pc.condominium_id = public.financial_transactions.condominium_id
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
        where pc.condominium_id = public.financial_transactions.condominium_id
          and pc.profile_id = auth.uid()
          and pc.deleted_at is null
          and (r.name = 'condominium_admin' or r.name = 'admin_operator')
    )
);


-- =========================================================================
-- 5. STATUS TRANSITION VALIDATION TRIGGER
-- =========================================================================

create or replace function public.check_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.status = old.status then
        return new;
    end if;

    if old.status = 'pending' and new.status in ('completed', 'voided') then
        return new;
    end if;

    if old.status = 'completed' and new.status = 'voided' then
        return new;
    end if;

    raise exception 'Invalid status transition: % -> %', old.status, new.status;
end;
$$;

create trigger trg_check_status_transition
    before update on public.financial_transactions
    for each row
    execute function public.check_status_transition();

comment on function public.check_status_transition() is 'Enforces allowed financial transaction status transitions.';


-- =========================================================================
-- 6. TERMINAL STATE EDIT PROTECTION TRIGGER
-- =========================================================================

create or replace function public.prevent_terminal_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Soft deletes are always allowed
    if old.deleted_at is null and new.deleted_at is not null then
        return new;
    end if;

    -- Status transitions are handled by check_status_transition
    if old.status != new.status then
        return new;
    end if;

    if old.status in ('completed', 'voided') then
        raise exception 'Cannot modify terminal transaction with status %', old.status;
    end if;

    return new;
end;
$$;

create trigger trg_prevent_terminal_edit
    before update on public.financial_transactions
    for each row
    execute function public.prevent_terminal_edit();

comment on function public.prevent_terminal_edit() is 'Prevents edits to completed or voided transactions except status transitions and soft deletes.';


-- =========================================================================
-- 7. RPC FUNCTIONS FOR OFFLINE SYNC
-- =========================================================================

-- FUNCTION: soft_delete_transaction
create or replace function public.soft_delete_transaction(
    p_id uuid,
    p_reversal_reason text default 'Deleted via sync'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_condominium_id uuid;
    v_has_permission boolean;
begin
    select condominium_id into v_condominium_id
    from public.financial_transactions
    where id = p_id and deleted_at is null;

    if not found then
        raise exception 'Transaction not found or already deleted: %', p_id;
    end if;

    select exists (
        select 1
        from public.profile_condominiums pc
        join public.roles r on pc.role_id = r.id
        where pc.condominium_id = v_condominium_id
          and pc.profile_id = auth.uid()
          and pc.deleted_at is null
          and (r.name = 'condominium_admin' or r.name = 'admin_operator')
    ) into v_has_permission;

    if not v_has_permission then
        raise exception 'Insufficient permissions to delete transaction';
    end if;

    update public.financial_transactions
    set deleted_at = now(),
        updated_at = now()
    where id = p_id;
end;
$$;

-- FUNCTION: insert_financial_transaction_idempotent
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

-- FUNCTION: update_financial_transaction_idempotent
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
-- 8. GRANTS
-- =========================================================================

grant select, insert, update, delete on public.financial_transactions to authenticated;
grant select on public.financial_transactions to anon;
grant all on public.financial_transactions to service_role;

grant execute on function public.soft_delete_transaction(uuid, text) to authenticated;
grant execute on function public.insert_financial_transaction_idempotent(text, uuid, uuid, uuid, uuid, uuid, text, text, numeric, varchar, numeric, numeric, text, text, date, uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.update_financial_transaction_idempotent(text, uuid, uuid, uuid, uuid, uuid, text, text, numeric, varchar, numeric, numeric, text, text, date, uuid, timestamptz, timestamptz) to authenticated;


-- =========================================================================
-- 9. DOCUMENTATION
-- =========================================================================

comment on function public.soft_delete_transaction(uuid, text) is
    'Soft deletes a financial transaction by setting deleted_at. Used by SyncService for offline mutations.';

comment on function public.insert_financial_transaction_idempotent(text, uuid, uuid, uuid, uuid, uuid, text, text, numeric, varchar, numeric, numeric, text, text, date, uuid, timestamptz, timestamptz) is
    'Idempotently inserts a financial transaction. Returns existing row if idempotency_key was already processed.';

comment on function public.update_financial_transaction_idempotent(text, uuid, uuid, uuid, uuid, uuid, text, text, numeric, varchar, numeric, numeric, text, text, date, uuid, timestamptz, timestamptz) is
    'Idempotently updates a financial transaction. Enforces terminal-state and status-transition triggers.';
