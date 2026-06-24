-- =========================================================================
-- Create condominium_invitations table
-- Invitation codes live separately from condominiums so non-members can
-- look up invitations by code without hitting RLS on the condominiums table.
-- =========================================================================

create table if not exists public.condominium_invitations (
    id uuid primary key default gen_random_uuid(),
    condominium_id uuid not null references public.condominiums(id) on delete cascade,
    code text not null unique,
    max_uses int,
    uses_count int not null default 0,
    expires_at timestamptz,
    active boolean not null default true,
    created_by uuid not null references public.profiles(id) on delete cascade,
    version bigint not null default 1,
    idempotency_key uuid not null default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint condominium_invitations_code_not_empty check (char_length(trim(code)) > 0),
    constraint condominium_invitations_uses_check check (uses_count >= 0)
);

comment on table public.condominium_invitations is 'Invitation codes for joining condominiums. Separated from condominiums table to allow non-member lookups.';

-- Trigger for updated_at
create trigger trg_condominium_invitations_updated_at
    before update on public.condominium_invitations
    for each row
    execute function public.set_current_timestamp_updated_at();

-- Function to generate unique 6-digit invitation code
create or replace function public.generate_invitation_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_code text;
    v_code_exists boolean;
begin
    -- Only generate if not already set
    if new.code is not null then
        return new;
    end if;
    
    -- Generate unique code with retry loop
    loop
        v_code := lpad(floor(random() * 1000000)::text, 6, '0');
        select exists(select 1 from public.condominium_invitations where code = v_code and deleted_at is null) into v_code_exists;
        exit when not v_code_exists;
    end loop;
    
    new.code := v_code;
    return new;
end;
$$;

-- Trigger to auto-generate code on insert
create trigger set_invitation_code_on_insert
    before insert on public.condominium_invitations
    for each row
    execute function public.generate_invitation_code();

-- =========================================================================
-- Indexes
-- =========================================================================
create index if not exists idx_condominium_invitations_code_active
    on public.condominium_invitations (code)
    where deleted_at is null and active = true;

create index if not exists idx_condominium_invitations_condo_id
    on public.condominium_invitations (condominium_id)
    where deleted_at is null;

create index if not exists idx_condominium_invitations_created_by
    on public.condominium_invitations (created_by)
    where deleted_at is null;

create index if not exists idx_condominium_invitations_updated_at
    on public.condominium_invitations (updated_at desc);

create index if not exists idx_condominium_invitations_idempotency_key
    on public.condominium_invitations (idempotency_key);

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.condominium_invitations enable row level security;

-- SELECT: Any authenticated user can look up active invitations by code
-- This allows non-members to find which condominium an invitation code belongs to
drop policy if exists condominium_invitations_select_policy on public.condominium_invitations;
create policy condominium_invitations_select_policy on public.condominium_invitations
for select to authenticated
using (
    deleted_at is null
    and active = true
    and (expires_at is null or expires_at > now())
);

-- INSERT: Only condominium admins can create invitations
drop policy if exists condominium_invitations_insert_policy on public.condominium_invitations;
create policy condominium_invitations_insert_policy on public.condominium_invitations
for insert to authenticated
with check (
    deleted_at is null
    and public.has_condominium_role(condominium_id, array['condominium_admin'])
);

-- UPDATE: Only condominium admins can modify invitations
drop policy if exists condominium_invitations_update_policy on public.condominium_invitations;
create policy condominium_invitations_update_policy on public.condominium_invitations
for update to authenticated
using (
    deleted_at is null
    and public.has_condominium_role(condominium_id, array['condominium_admin'])
)
with check (
    public.has_condominium_role(condominium_id, array['condominium_admin'])
);

-- =========================================================================
-- Grants
-- =========================================================================
grant select, insert, update on public.condominium_invitations to authenticated;
