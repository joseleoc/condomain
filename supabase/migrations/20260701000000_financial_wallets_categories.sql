-- =========================================================================
-- Migration: Financial Wallets & Categories (Phase 1 Foundation)
-- Tables: condominium_accounts, transaction_categories
-- Features: partial unique indexes, RLS, soft-delete RPCs, category depth
-- trigger, system category seeding on condominium creation
-- =========================================================================

-- =========================================================================
-- 1. TABLE CREATION
-- =========================================================================

create table if not exists public.condominium_accounts (
    id uuid primary key default gen_random_uuid(),
    condominium_id uuid not null references public.condominiums(id) on delete cascade,
    name text not null,
    account_type text not null,
    currency varchar(3) not null references public.currencies(iso_code),
    institution_name text,
    initial_balance numeric(15, 2) not null default 0,
    current_balance numeric(15, 2) not null default 0,
    icon text,
    color text,
    version bigint not null default 1,
    created_by uuid default auth.uid(),
    idempotency_key uuid not null default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,

    constraint condominium_accounts_name_not_empty check (char_length(trim(name)) > 0),
    constraint condominium_accounts_type_valid check (account_type in ('bank', 'cash', 'wallet', 'credit', 'investment'))
);

comment on table public.condominium_accounts is 'Financial wallets and accounts owned by a condominium.';
comment on column public.condominium_accounts.account_type is 'Account classification: bank, cash, wallet, credit, or investment.';
comment on column public.condominium_accounts.initial_balance is 'Opening balance recorded when the account is created.';
comment on column public.condominium_accounts.current_balance is 'Denormalized running balance, updated by transaction triggers in Phase 2.';


create table if not exists public.transaction_categories (
    id uuid primary key default gen_random_uuid(),
    condominium_id uuid not null references public.condominiums(id) on delete cascade,
    parent_id uuid references public.transaction_categories(id) on delete set null,
    name text not null,
    category_type text not null,
    icon text,
    color text,
    is_system boolean not null default false,
    i18n_key text,
    version bigint not null default 1,
    created_by uuid default auth.uid(),
    idempotency_key uuid not null default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,

    constraint transaction_categories_name_not_empty check (char_length(trim(name)) > 0),
    constraint transaction_categories_type_valid check (category_type in ('income', 'expense'))
);

comment on table public.transaction_categories is 'Income and expense categories for classifying financial transactions.';
comment on column public.transaction_categories.parent_id is 'Self-reference for a two-level hierarchy; null means root category.';
comment on column public.transaction_categories.category_type is 'Direction of the category: income or expense.';
comment on column public.transaction_categories.is_system is 'System-defined categories are seeded automatically and cannot be deleted.';
comment on column public.transaction_categories.i18n_key is 'Translation key for system category labels.';


-- =========================================================================
-- 2. AUTOMATED TIMESTAMP TRIGGERS
-- =========================================================================

create trigger trg_condominium_accounts_updated_at
    before update on public.condominium_accounts
    for each row
    execute function public.set_current_timestamp_updated_at();

create trigger trg_transaction_categories_updated_at
    before update on public.transaction_categories
    for each row
    execute function public.set_current_timestamp_updated_at();


-- =========================================================================
-- 3. CATEGORY DEPTH VALIDATION TRIGGER
-- =========================================================================

create or replace function public.check_category_depth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_parent_parent_id uuid;
begin
    if new.parent_id is not null then
        select parent_id into v_parent_parent_id
        from public.transaction_categories
        where id = new.parent_id;

        if v_parent_parent_id is not null then
            raise exception 'Category hierarchy cannot exceed 2 levels';
        end if;
    end if;

    return new;
end;
$$;

create trigger trg_check_category_depth
    before insert or update on public.transaction_categories
    for each row
    execute function public.check_category_depth();

comment on function public.check_category_depth() is 'Enforces a maximum category depth of two levels (root + child).';


-- =========================================================================
-- 4. PARTIAL UNIQUE INDEXES (must exist before seed trigger)
-- =========================================================================

 create unique index if not exists condominium_accounts_name_condo_unique_active
     on public.condominium_accounts (condominium_id, name)
     where deleted_at is null;

 create unique index if not exists transaction_categories_unique_active
     on public.transaction_categories (
         condominium_id,
         name,
         coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
     )
     where deleted_at is null;


-- =========================================================================
-- 5. SYSTEM CATEGORY SEEDING TRIGGER
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
        (condominium_id, name, category_type, is_system, i18n_key)
    values
        (v_condominium_id, 'maintenance', 'expense', true, 'maintenance'),
        (v_condominium_id, 'services', 'expense', true, 'services'),
        (v_condominium_id, 'administration', 'expense', true, 'administration'),
        (v_condominium_id, 'security', 'expense', true, 'security'),
        (v_condominium_id, 'cleaning', 'expense', true, 'cleaning')
    on conflict do nothing;

    -- Income root categories
    insert into public.transaction_categories
        (condominium_id, name, category_type, is_system, i18n_key)
    values
        (v_condominium_id, 'fees', 'income', true, 'fees'),
        (v_condominium_id, 'reserves', 'income', true, 'reserves'),
        (v_condominium_id, 'other_income', 'income', true, 'other_income')
    on conflict do nothing;

    -- Expense children: maintenance
    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'maintenance_common_areas', 'expense', true, 'maintenance_common_areas'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'maintenance' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'maintenance_repairs', 'expense', true, 'maintenance_repairs'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'maintenance' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    -- Expense children: services
    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'services_electricity', 'expense', true, 'services_electricity'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'services_water', 'expense', true, 'services_water'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'services_gas', 'expense', true, 'services_gas'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'services_internet', 'expense', true, 'services_internet'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'services_phone', 'expense', true, 'services_phone'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'services_waste', 'expense', true, 'services_waste'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'services' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    -- Expense children: administration
    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'administration_fees', 'expense', true, 'administration_fees'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'administration' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'administration_salaries', 'expense', true, 'administration_salaries'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'administration' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;



    -- Income children: fees
    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'fees_monthly', 'income', true, 'fees_monthly'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'fees' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;

    insert into public.transaction_categories
        (condominium_id, parent_id, name, category_type, is_system, i18n_key)
    select v_condominium_id, p.id, 'fees_extraordinary', 'income', true, 'fees_extraordinary'
    from public.transaction_categories p
    where p.condominium_id = v_condominium_id and p.name = 'fees' and p.parent_id is null and p.deleted_at is null
    on conflict do nothing;



    return new;
end;
$$;

create trigger trg_condominiums_seed_system_categories
    after insert on public.condominiums
    for each row
    execute function public.seed_system_categories();

comment on function public.seed_system_categories() is 'Seeds default income and expense categories when a condominium is created.';


-- =========================================================================
-- 6. ROW LEVEL SECURITY
-- =========================================================================

alter table public.condominium_accounts enable row level security;
alter table public.transaction_categories enable row level security;

-- condominium_accounts: SELECT for members
drop policy if exists "Users can view accounts of their condominiums" on public.condominium_accounts;
create policy "Users can view accounts of their condominiums" on public.condominium_accounts
for select
using (
    deleted_at is null
    and exists (
        select 1
        from public.profile_condominiums pc
        where pc.condominium_id = public.condominium_accounts.condominium_id
          and pc.profile_id = auth.uid()
          and pc.deleted_at is null
    )
);

-- condominium_accounts: INSERT/UPDATE/DELETE for admin/operator
drop policy if exists "Admins and Operators can manage accounts" on public.condominium_accounts;
create policy "Admins and Operators can manage accounts" on public.condominium_accounts
for all
using (
    deleted_at is null
    and exists (
        select 1
        from public.profile_condominiums pc
        join public.roles r on pc.role_id = r.id
        where pc.condominium_id = public.condominium_accounts.condominium_id
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
        where pc.condominium_id = public.condominium_accounts.condominium_id
          and pc.profile_id = auth.uid()
          and pc.deleted_at is null
          and (r.name = 'condominium_admin' or r.name = 'admin_operator')
    )
);

-- transaction_categories: SELECT for members
drop policy if exists "Users can view categories of their condominiums" on public.transaction_categories;
create policy "Users can view categories of their condominiums" on public.transaction_categories
for select
using (
    deleted_at is null
    and exists (
        select 1
        from public.profile_condominiums pc
        where pc.condominium_id = public.transaction_categories.condominium_id
          and pc.profile_id = auth.uid()
          and pc.deleted_at is null
    )
);

-- transaction_categories: INSERT/UPDATE/DELETE for admin/operator
drop policy if exists "Admins and Operators can manage categories" on public.transaction_categories;
create policy "Admins and Operators can manage categories" on public.transaction_categories
for all
using (
    deleted_at is null
    and exists (
        select 1
        from public.profile_condominiums pc
        join public.roles r on pc.role_id = r.id
        where pc.condominium_id = public.transaction_categories.condominium_id
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
        where pc.condominium_id = public.transaction_categories.condominium_id
          and pc.profile_id = auth.uid()
          and pc.deleted_at is null
          and (r.name = 'condominium_admin' or r.name = 'admin_operator')
    )
);

-- transaction_categories: prevent deletion of system rows
drop policy if exists "System categories cannot be deleted" on public.transaction_categories;
create policy "System categories cannot be deleted" on public.transaction_categories
for delete
using (not is_system);


-- =========================================================================
-- 7. RPC FUNCTIONS FOR OFFLINE SYNC
-- =========================================================================

-- FUNCTION: soft_delete_account
create or replace function public.soft_delete_account(
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
    from public.condominium_accounts
    where id = p_id and deleted_at is null;

    if not found then
        raise exception 'Account not found or already deleted: %', p_id;
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
        raise exception 'Insufficient permissions to delete account';
    end if;

    update public.condominium_accounts
    set deleted_at = now(),
        updated_at = now()
    where id = p_id;
end;
$$;

-- FUNCTION: soft_delete_category
create or replace function public.soft_delete_category(
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
    v_is_system boolean;
begin
    select condominium_id, is_system into v_condominium_id, v_is_system
    from public.transaction_categories
    where id = p_id and deleted_at is null;

    if not found then
        raise exception 'Category not found or already deleted: %', p_id;
    end if;

    if v_is_system then
        raise exception 'System categories cannot be deleted';
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
        raise exception 'Insufficient permissions to delete category';
    end if;

    update public.transaction_categories
    set deleted_at = now(),
        updated_at = now()
    where id = p_id;
end;
$$;


-- =========================================================================
-- 8. GRANTS
-- =========================================================================

grant select, insert, update, delete on public.condominium_accounts to authenticated;
grant select on public.condominium_accounts to anon;
grant all on public.condominium_accounts to service_role;

grant select, insert, update, delete on public.transaction_categories to authenticated;
grant select on public.transaction_categories to anon;
grant all on public.transaction_categories to service_role;

grant execute on function public.soft_delete_account(uuid, text) to authenticated;
grant execute on function public.soft_delete_category(uuid, text) to authenticated;


-- =========================================================================
-- 9. DOCUMENTATION
-- =========================================================================

comment on function public.soft_delete_account(uuid, text) is
    'Soft deletes a condominium account by setting deleted_at. Used by SyncService for offline mutations.';

comment on function public.soft_delete_category(uuid, text) is
    'Soft deletes a transaction category by setting deleted_at. Prevents deletion of system categories.';
