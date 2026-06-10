create table if not exists public.roles (
	id uuid primary key default uuid_generate_v4(),
	name text not null,
	description text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz,
	is_deleted boolean not null default false,
	constraint roles_name_unique unique (name)
);

comment on table public.roles is 'Role catalog used for condominium membership permissions.';

create table if not exists public.condominiums (
	id uuid primary key default uuid_generate_v4(),
	name text not null,
	location text,
	avatar text,
	currency varchar(3) not null references public.currencies(iso_code),
	owner_id uuid not null references public.profiles(id) on delete cascade,
	balance numeric(14,2) not null default 0,
	initial_balance numeric(14,2) not null default 0,
	active boolean not null default true,
	updated_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	deleted_at timestamptz,
	is_deleted boolean not null default false,
	constraint condominiums_name_not_empty check (char_length(trim(name)) > 0)
);

comment on table public.condominiums is 'Condominium master data with condominium-wide balance.';

create table if not exists public.user_condominiums (
	id uuid primary key default uuid_generate_v4(),
	user_id uuid not null references public.profiles(id) on delete cascade,
	condominium_id uuid not null references public.condominiums(id) on delete cascade,
	role_id uuid not null references public.roles(id),
	updated_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	deleted_at timestamptz,
	is_deleted boolean not null default false,
	constraint user_condominiums_user_id_condominium_id_unique unique (user_id, condominium_id)
);

comment on table public.user_condominiums is 'Membership link between users and condominiums with role assignment.';

create table if not exists public.condominium_transactions (
	id uuid primary key default uuid_generate_v4(),
	condominium_id uuid not null references public.condominiums(id) on delete cascade,
	amount numeric(14,2) not null,
	kind text not null,
	previous_balance numeric(14,2) not null,
	new_balance numeric(14,2) not null,
	reference_id text,
	description text,
	metadata jsonb not null default '{}'::jsonb,
	created_by uuid not null references public.profiles(id) on delete restrict,
	updated_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	deleted_at timestamptz,
	is_deleted boolean not null default false,
	constraint condominium_transactions_kind_check check (kind in ('credit', 'debit', 'adjustment')),
	constraint condominium_transactions_balance_transition_check check (new_balance = previous_balance + amount)
);

comment on table public.condominium_transactions is 'Full ledger of condominium balance transitions.';

create index if not exists idx_condominiums_owner_active_updated_at
	on public.condominiums (owner_id, active, updated_at desc)
	where is_deleted = false;

create index if not exists idx_user_condominiums_user_active
	on public.user_condominiums (user_id)
	where is_deleted = false;

create index if not exists idx_user_condominiums_condominium_active
	on public.user_condominiums (condominium_id)
	where is_deleted = false;

create index if not exists idx_condominium_transactions_condominium_created_at
	on public.condominium_transactions (condominium_id, created_at desc)
	where is_deleted = false;

-- Returns true when a user has an active (not soft-deleted) membership in a condominium.
create or replace function public.is_condominium_member(
	p_condominium_id uuid,
	p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.user_condominiums uc
		where uc.condominium_id = p_condominium_id
			and uc.user_id = p_user_id
			and uc.is_deleted = false
	);
$$;

-- Returns true when a user has any of the requested role names in a condominium.
create or replace function public.has_condominium_role(
	p_condominium_id uuid,
	p_role_names text[],
	p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.user_condominiums uc
		join public.roles r on r.id = uc.role_id
		where uc.condominium_id = p_condominium_id
			and uc.user_id = p_user_id
			and uc.is_deleted = false
			and r.name = any (p_role_names)
			and r.is_deleted = false
	);
$$;

-- Automatically links the condominium owner as a resident_owner membership after insert.
create or replace function public.handle_new_condominium_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_owner_role_id uuid;
begin
	select r.id into v_owner_role_id
	from public.roles r
	where r.name = 'resident_owner'
	limit 1;

	if v_owner_role_id is null then
		raise exception 'Role resident_owner not found in public.roles';
	end if;

	insert into public.user_condominiums (user_id, condominium_id, role_id)
	values (new.owner_id, new.id, v_owner_role_id)
	on conflict (user_id, condominium_id) do nothing;

	return new;
end;
$$;

alter table public.roles enable row level security;
alter table public.condominiums enable row level security;
alter table public.user_condominiums enable row level security;
alter table public.condominium_transactions enable row level security;

-- Allow authenticated users to read role catalog entries that are not soft-deleted.
drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated
on public.roles
for select
to authenticated
using (is_deleted = false);

-- Allow admin-level condominium roles to read condominium records.
drop policy if exists condominiums_select_member on public.condominiums;
create policy condominiums_select_member
on public.condominiums
for select
to authenticated
using (
	is_deleted = false
	and public.has_condominium_role(id, array['condominium_admin', 'admin_operator'])
);

-- Allow users to create condominiums only when they are the declared owner.
drop policy if exists condominiums_insert_owner on public.condominiums;
create policy condominiums_insert_owner
on public.condominiums
for insert
to authenticated
with check (
	auth.uid() = owner_id
);

-- Allow privileged roles to update condominium records within their condominium context.
drop policy if exists condominiums_update_privileged_member on public.condominiums;
create policy condominiums_update_privileged_member
on public.condominiums
for update
to authenticated
using (
	public.has_condominium_role(id, array['condominium_admin', 'admin_operator'])
)
with check (
	public.has_condominium_role(id, array['condominium_admin', 'admin_operator'])
);

-- Allow users to read their own memberships and privileged roles to read all memberships in their condominium.
drop policy if exists user_condominiums_select_member_context on public.user_condominiums;
create policy user_condominiums_select_member_context
on public.user_condominiums
for select
to authenticated
using (
	is_deleted = false
	and (
		user_id = auth.uid()
		or public.has_condominium_role(
			condominium_id,
			array['condominium_admin', 'admin_operator']
		)
	)
);

-- Allow privileged roles to add memberships in their condominium.
drop policy if exists user_condominiums_insert_privileged_member on public.user_condominiums;
create policy user_condominiums_insert_privileged_member
on public.user_condominiums
for insert
to authenticated
with check (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

-- Allow privileged roles to update memberships in their condominium.
drop policy if exists user_condominiums_update_privileged_member on public.user_condominiums;
create policy user_condominiums_update_privileged_member
on public.user_condominiums
for update
to authenticated
using (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
)
with check (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

-- Allow privileged roles to remove memberships in their condominium.
drop policy if exists user_condominiums_delete_privileged_member on public.user_condominiums;
create policy user_condominiums_delete_privileged_member
on public.user_condominiums
for delete
to authenticated
using (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

-- Allow admin-level condominium roles to read transaction ledger entries.
drop policy if exists condominium_transactions_select_member on public.condominium_transactions;
create policy condominium_transactions_select_member
on public.condominium_transactions
for select
to authenticated
using (
	is_deleted = false
	and public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

-- Allow admin-level condominium roles to insert transaction ledger entries.
drop policy if exists condominium_transactions_insert_member on public.condominium_transactions;
create policy condominium_transactions_insert_member
on public.condominium_transactions
for insert
to authenticated
with check (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
	and is_deleted = false
);

-- Allow privileged roles to update transaction entries in their condominium.
drop policy if exists condominium_transactions_update_privileged_member on public.condominium_transactions;
create policy condominium_transactions_update_privileged_member
on public.condominium_transactions
for update
to authenticated
using (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
)
with check (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

drop trigger if exists trg_roles_updated_at on public.roles;
create trigger trg_roles_updated_at
before update on public.roles
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_condominiums_updated_at on public.condominiums;
create trigger trg_condominiums_updated_at
before update on public.condominiums
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_user_condominiums_updated_at on public.user_condominiums;
create trigger trg_user_condominiums_updated_at
before update on public.user_condominiums
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_condominium_transactions_updated_at on public.condominium_transactions;
create trigger trg_condominium_transactions_updated_at
before update on public.condominium_transactions
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_condominiums_owner_membership on public.condominiums;
create trigger trg_condominiums_owner_membership
after insert on public.condominiums
for each row
execute function public.handle_new_condominium_owner_membership();
