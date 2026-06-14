-- Create profiles table linked 1:1 with Supabase Auth users.
create table if not exists public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	name text,
	email text not null,
	phone_number text,
	avatar text,
	updated_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	deleted_at timestamptz,
	is_deleted boolean not null default false,
	constraint profiles_email_unique unique (email)
);

comment on table public.profiles is 'Application profile data tied to auth.users.';

alter table public.profiles enable row level security;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.profiles (id, name, email)
	values (
		new.id,
		coalesce(new.raw_user_meta_data ->> 'name', ''),
		new.email
	)
	on conflict (id) do nothing;

	return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_new_auth_user_profile();

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
