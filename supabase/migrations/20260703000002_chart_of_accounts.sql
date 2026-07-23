-- =========================================================================
-- Migration: Chart of Accounts (Per-Condominium)
-- Table: chart_of_accounts
-- Features: auto-population from system, system account protection, RLS
-- =========================================================================

-- =========================================================================
-- 1. TABLE CREATION
-- =========================================================================

create table if not exists public.chart_of_accounts (
    id uuid primary key default gen_random_uuid(),
    condominium_id uuid not null references public.condominiums(id) on delete cascade,
    system_account_id uuid references public.chart_of_accounts_system(id) on delete restrict,
    parent_id uuid references public.chart_of_accounts(id) on delete restrict,
    code varchar(50) not null,
    name varchar(100) not null,
    name_en varchar(100),
    type varchar(20) not null,
    is_system_defined boolean generated always as (system_account_id is not null) stored,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,

    constraint chart_of_accounts_type_valid check (type in ('asset', 'liability', 'equity', 'income', 'expense')),
    constraint chart_of_accounts_code_not_empty check (char_length(trim(code)) > 0),
    constraint chart_of_accounts_name_not_empty check (char_length(trim(name)) > 0),
    constraint chart_of_accounts_unique_code_per_condo unique (condominium_id, code)
);

comment on table public.chart_of_accounts is 'Per-condominium chart of accounts. References system accounts or user-created accounts.';
comment on column public.chart_of_accounts.condominium_id is 'FK to the condominium that owns this account.';
comment on column public.chart_of_accounts.system_account_id is 'FK to global system account. NULL = user-created account.';
comment on column public.chart_of_accounts.parent_id is 'Self-referential FK for hierarchical tree structure within the condominium.';
comment on column public.chart_of_accounts.is_system_defined is 'Computed column. TRUE = system account (immutable from condo side).';


-- =========================================================================
-- 2. AUTOMATED TIMESTAMP TRIGGER
-- =========================================================================

create trigger trg_chart_of_accounts_updated_at
    before update on public.chart_of_accounts
    for each row
    execute function public.set_current_timestamp_updated_at();


-- =========================================================================
-- 3. INDEXES
-- =========================================================================

create index if not exists idx_coa_condominium_id
    on public.chart_of_accounts (condominium_id)
    where deleted_at is null;

create index if not exists idx_coa_system_account_id
    on public.chart_of_accounts (system_account_id)
    where system_account_id is not null;

create index if not exists idx_coa_parent_id
    on public.chart_of_accounts (parent_id)
    where parent_id is not null and deleted_at is null;

create index if not exists idx_coa_is_system_defined
    on public.chart_of_accounts (is_system_defined)
    where is_system_defined = true;


-- =========================================================================
-- 4. TRIGGER: Auto-Populate Accounts When Condominium is Created
-- =========================================================================

create or replace function public.auto_populate_chart_of_accounts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Insert all active system accounts as references for the new condominium
    insert into public.chart_of_accounts (
        condominium_id,
        system_account_id,
        parent_id,
        code,
        name,
        name_en,
        type
    )
    select
        new.id,
        sa.id,
        -- Map system parent_id to the corresponding condo-level account
        parent_mapping.condo_account_id,
        sa.code,
        sa.name,
        sa.name_en,
        sa.type
    from public.chart_of_accounts_system sa
    left join lateral (
        -- Find the condo-level account that corresponds to the system account's parent
        select coa.id as condo_account_id
        from public.chart_of_accounts coa
        where coa.condominium_id = new.id
            and coa.system_account_id = sa.parent_id
        limit 1
    ) parent_mapping on true
    where sa.is_active = true
    order by sa.code;  -- Insert in code order so parents exist before children

    return new;
end;
$$;

create trigger trg_condominiums_auto_populate_chart_of_accounts
    after insert on public.condominiums
    for each row
    execute function public.auto_populate_chart_of_accounts();

comment on function public.auto_populate_chart_of_accounts() is
    'Automatically populates chart_of_accounts for a new condominium by referencing all active system accounts.';


-- =========================================================================
-- 5. TRIGGER: Prevent Modification of System-Defined Accounts
-- =========================================================================

create or replace function public.prevent_system_account_modification()
returns trigger
language plpgsql
as $$
begin
    -- Only check for UPDATE operations
    if tg_op = 'UPDATE' then
        -- If the account is system-defined, prevent any modification
        if old.is_system_defined = true then
            raise exception 'Cannot modify system-defined accounts. System accounts are managed globally.'
                using hint = 'System accounts (is_system_defined = true) are immutable from the condominium side.',
                        errcode = 'P0001';
        end if;
    end if;

    return new;
end;
$$;

create trigger trg_chart_of_accounts_prevent_system_modification
    before update on public.chart_of_accounts
    for each row
    execute function public.prevent_system_account_modification();

comment on function public.prevent_system_account_modification() is
    'Prevents modification of system-defined accounts from the condominium side.';


-- =========================================================================
-- 6. TRIGGER: Prevent Deletion of System-Defined Accounts
-- =========================================================================

create or replace function public.prevent_system_account_deletion()
returns trigger
language plpgsql
as $$
begin
    if old.is_system_defined = true then
        raise exception 'Cannot delete system-defined accounts. System accounts are managed globally.'
            using hint = 'System accounts (is_system_defined = true) cannot be deleted from the condominium side.',
                    errcode = 'P0001';
    end if;

    return old;
end;
$$;

create trigger trg_chart_of_accounts_prevent_system_deletion
    before delete on public.chart_of_accounts
    for each row
    execute function public.prevent_system_account_deletion();

comment on function public.prevent_system_account_deletion() is
    'Prevents deletion of system-defined accounts from the condominium side.';


-- =========================================================================
-- 7. ROW LEVEL SECURITY
-- =========================================================================

alter table public.chart_of_accounts enable row level security;

-- SELECT: Members can read their condominium's accounts
drop policy if exists "Users can view chart of accounts of their condominiums" on public.chart_of_accounts;
create policy "Users can view chart of accounts of their condominiums" on public.chart_of_accounts
    for select
    to authenticated
    using (
        deleted_at is null
        and exists (
            select 1
            from public.profile_condominiums pc
            where pc.condominium_id = chart_of_accounts.condominium_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
        )
    );

-- INSERT: Admin/operator can create user-defined accounts only
drop policy if exists "Admins can create chart of accounts" on public.chart_of_accounts;
create policy "Admins can create chart of accounts" on public.chart_of_accounts
    for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.profile_condominiums pc
            join public.roles r on pc.role_id = r.id
            where pc.condominium_id = chart_of_accounts.condominium_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
                and (r.name = 'condominium_admin' or r.name = 'admin_operator')
        )
        -- Cannot manually insert system-defined accounts (those are auto-populated)
        and system_account_id is null
    );

-- UPDATE: Admin/operator can modify user-created accounts only
drop policy if exists "Admins can update chart of accounts" on public.chart_of_accounts;
create policy "Admins can update chart of accounts" on public.chart_of_accounts
    for update
    to authenticated
    using (
        deleted_at is null
        and exists (
            select 1
            from public.profile_condominiums pc
            join public.roles r on pc.role_id = r.id
            where pc.condominium_id = chart_of_accounts.condominium_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
                and (r.name = 'condominium_admin' or r.name = 'admin_operator')
        )
    )
    with check (
        -- Can only update user-created accounts (system accounts blocked by trigger)
        system_account_id is null
    );

-- DELETE: Admin can delete user-created accounts only
drop policy if exists "Admins can delete chart of accounts" on public.chart_of_accounts;
create policy "Admins can delete chart of accounts" on public.chart_of_accounts
    for delete
    to authenticated
    using (
        deleted_at is null
        and is_system_defined = false
        and exists (
            select 1
            from public.profile_condominiums pc
            join public.roles r on pc.role_id = r.id
            where pc.condominium_id = chart_of_accounts.condominium_id
                and pc.profile_id = auth.uid()
                and pc.deleted_at is null
                and r.name = 'condominium_admin'
        )
    );


-- =========================================================================
-- 8. GRANTS
-- =========================================================================

grant select on public.chart_of_accounts to authenticated;
grant select on public.chart_of_accounts to anon;
grant insert, update, delete on public.chart_of_accounts to authenticated;
grant all on public.chart_of_accounts to service_role;
