create table if not exists public.structures (
	id uuid primary key default uuid_generate_v4(),
	condominium_id uuid not null references public.condominiums(id) on delete cascade,
	name text not null,
	description text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz,
	constraint structures_name_not_empty check (char_length(trim(name)) > 0),
	constraint structures_id_condominium_unique unique (id, condominium_id)
);

comment on table public.structures is 'Condominium structure groups such as towers, blocks, sectors, or single-group fallback.';

create table if not exists public.properties (
	id uuid primary key default uuid_generate_v4(),
	property_number text not null,
	floor text,
	initial_balance numeric(14,2) not null default 0,
	balance numeric(14,2) not null default 0,
	share_percentage numeric(5,2) not null,
	status text not null default 'active',
	structure_id uuid not null,
	condominium_id uuid not null references public.condominiums(id) on delete cascade,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz,
	constraint properties_number_not_empty check (char_length(trim(property_number)) > 0),
	constraint properties_share_percentage_range check (share_percentage >= 0 and share_percentage <= 100),
	constraint properties_status_check check (status in ('active', 'inactive', 'maintenance')),
	constraint properties_structure_condominium_fk
		foreign key (structure_id, condominium_id)
		references public.structures(id, condominium_id)
		on delete cascade,
	constraint properties_id_condominium_unique unique (id, condominium_id)
);


comment on table public.properties is 'Individual condominium units with balances and share quotas.';

create table if not exists public.user_properties (
	id uuid primary key default uuid_generate_v4(),
	user_id uuid not null references public.profiles(id) on delete cascade,
	property_id uuid not null,
	condominium_id uuid not null,
	role text not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz,
	constraint user_properties_role_check check (role in ('owner', 'tenant', 'manager', 'co_owner')),
	constraint user_properties_property_condominium_fk
		foreign key (property_id, condominium_id)
		references public.properties(id, condominium_id)
		on delete cascade
);

comment on table public.user_properties is 'User assignments to properties with role context.';


create unique index if not exists uq_structures_condominium_name_active
	on public.structures (condominium_id, name)
	where deleted_at is null;

create unique index if not exists uq_properties_condominium_number_active
	on public.properties (condominium_id, property_number)
	where deleted_at is null;

create unique index if not exists uq_user_properties_user_property_role_active
	on public.user_properties (user_id, property_id, role)
	where deleted_at is null;

create index if not exists idx_structures_condominium_active
	on public.structures (condominium_id, updated_at desc)
	where deleted_at is null;

create index if not exists idx_properties_structure_active
	on public.properties (structure_id)
	where deleted_at is null;

create index if not exists idx_properties_condominium_status_active
	on public.properties (condominium_id, status)
	where deleted_at is null;

create index if not exists idx_user_properties_user_active
	on public.user_properties (user_id)
	where deleted_at is null;

create index if not exists idx_user_properties_property_active
	on public.user_properties (property_id)
	where deleted_at is null;

-- Validates that active properties within a condominium total exactly 100 percent share.
create or replace function public.validate_condominium_share_percentage_total(
	p_condominium_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_total numeric(7,2);
begin
	select coalesce(round(sum(p.share_percentage), 2), 0)
	into v_total
	from public.properties p
	where p.condominium_id = p_condominium_id
		and p.deleted_at is null;

	if v_total <> 100 then
		raise exception 'Property share percentage total must be 100.00 for condominium %, current total: %', p_condominium_id, v_total
			using errcode = '23514';
	end if;
end;
$$;

-- Executes deferred quota validation after property insert, update, or delete operations.
create or replace function public.handle_validate_condominium_property_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_condominium_id uuid;
begin
	v_condominium_id := coalesce(new.condominium_id, old.condominium_id);
	perform public.validate_condominium_share_percentage_total(v_condominium_id);
	return coalesce(new, old);
end;
$$;

alter table public.structures enable row level security;
alter table public.properties enable row level security;
alter table public.user_properties enable row level security;

-- Allow admin-level condominium roles to read active structures.
drop policy if exists structures_select_member on public.structures;
create policy structures_select_member
on public.structures
for select
to authenticated
using (
	deleted_at is null
	and public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

-- Allow privileged condominium roles to create structures.
drop policy if exists structures_insert_privileged_member on public.structures;
create policy structures_insert_privileged_member
on public.structures
for insert
to authenticated
with check (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

-- Allow privileged condominium roles to update structures.
drop policy if exists structures_update_privileged_member on public.structures;
create policy structures_update_privileged_member
on public.structures
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

-- Allow privileged condominium roles to delete structures.
drop policy if exists structures_delete_privileged_member on public.structures;
create policy structures_delete_privileged_member
on public.structures
for delete
to authenticated
using (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

-- Allow admin-level condominium roles to read all properties, and users to read only their own assigned properties.
drop policy if exists properties_select_member on public.properties;
create policy properties_select_member
on public.properties
for select
to authenticated
using (
	deleted_at is null
	and (
		public.has_condominium_role(
			condominium_id,
			array['condominium_admin', 'admin_operator']
		)
		or exists (
			select 1
			from public.user_properties up
			where up.property_id = properties.id
				and up.condominium_id = properties.condominium_id
				and up.user_id = auth.uid()
				and up.deleted_at is null
		)
	)
);

-- Allow privileged condominium roles to create properties.
drop policy if exists properties_insert_privileged_member on public.properties;
create policy properties_insert_privileged_member
on public.properties
for insert
to authenticated
with check (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

-- Allow privileged condominium roles to update properties.
drop policy if exists properties_update_privileged_member on public.properties;
create policy properties_update_privileged_member
on public.properties
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

-- Allow privileged condominium roles to delete properties.
drop policy if exists properties_delete_privileged_member on public.properties;
create policy properties_delete_privileged_member
on public.properties
for delete
to authenticated
using (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

-- Allow users to read their own property assignments and privileged roles to read all assignments.
drop policy if exists user_properties_select_member_context on public.user_properties;
create policy user_properties_select_member_context
on public.user_properties
for select
to authenticated
using (
	deleted_at is null
	and (
		user_id = auth.uid()
		or public.has_condominium_role(
			condominium_id,
			array['condominium_admin', 'admin_operator']
		)
	)
);

-- Allow privileged condominium roles to create property assignments.
drop policy if exists user_properties_insert_privileged_member on public.user_properties;
create policy user_properties_insert_privileged_member
on public.user_properties
for insert
to authenticated
with check (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

-- Allow privileged condominium roles to update property assignments.
drop policy if exists user_properties_update_privileged_member on public.user_properties;
create policy user_properties_update_privileged_member
on public.user_properties
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

-- Allow privileged condominium roles to delete property assignments.
drop policy if exists user_properties_delete_privileged_member on public.user_properties;
create policy user_properties_delete_privileged_member
on public.user_properties
for delete
to authenticated
using (
	public.has_condominium_role(
		condominium_id,
		array['condominium_admin', 'admin_operator']
	)
);

drop trigger if exists trg_structures_updated_at on public.structures;
create trigger trg_structures_updated_at
before update on public.structures
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_properties_updated_at on public.properties;
create trigger trg_properties_updated_at
before update on public.properties
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_user_properties_updated_at on public.user_properties;
create trigger trg_user_properties_updated_at
before update on public.user_properties
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_properties_validate_total_share on public.properties;
create constraint trigger trg_properties_validate_total_share
after insert or update or delete on public.properties
deferrable initially deferred
for each row
execute function public.handle_validate_condominium_property_quota();
