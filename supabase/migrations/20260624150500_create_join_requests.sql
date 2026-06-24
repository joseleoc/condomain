-- =========================================================================
-- Create table for condominium join requests
-- Users request to join a condominium using an invitation code.
-- Admins can approve or decline requests.
-- =========================================================================

create table if not exists public.condominium_join_requests (
    id uuid primary key default gen_random_uuid(),
    condominium_id uuid not null references public.condominiums(id) on delete cascade,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    invitation_id uuid not null references public.condominium_invitations(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
    reviewed_by uuid references public.profiles(id) on delete set null,
    reviewed_at timestamptz,
    version bigint not null default 1,
    created_by uuid not null references public.profiles(id) on delete cascade,
    idempotency_key uuid not null default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    -- Prevent duplicate pending requests for the same user+condo+invitation
    constraint condominium_join_requests_unique_pending unique (condominium_id, profile_id, invitation_id, status)
);

comment on table public.condominium_join_requests is 'Requests from users to join a condominium via invitation. Admins approve or decline.';

-- Trigger for updated_at
create trigger trg_condominium_join_requests_updated_at
    before update on public.condominium_join_requests
    for each row
    execute function public.set_current_timestamp_updated_at();

-- =========================================================================
-- Indexes
-- =========================================================================

-- For fetching pending requests by condominium (admin view)
create index if not exists idx_join_requests_condo_status
    on public.condominium_join_requests (condominium_id, status)
    where deleted_at is null;

-- For fetching requests by profile (user's own requests)
create index if not exists idx_join_requests_profile
    on public.condominium_join_requests (profile_id)
    where deleted_at is null;

-- For fetching requests by invitation
create index if not exists idx_join_requests_invitation
    on public.condominium_join_requests (invitation_id)
    where deleted_at is null;

create index if not exists idx_join_requests_updated_at
    on public.condominium_join_requests (updated_at desc);

create index if not exists idx_join_requests_idempotency_key
    on public.condominium_join_requests (idempotency_key);

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.condominium_join_requests enable row level security;

-- SELECT: Users can see their own requests; admins can see all requests for their condos
drop policy if exists join_requests_select_policy on public.condominium_join_requests;
create policy join_requests_select_policy on public.condominium_join_requests
for select to authenticated
using (
    deleted_at is null
    and (
        profile_id = auth.uid()
        or public.has_condominium_role(condominium_id, array['condominium_admin', 'admin_operator'])
    )
);

-- INSERT: Any authenticated user can create a join request for themselves
drop policy if exists join_requests_insert_policy on public.condominium_join_requests;
create policy join_requests_insert_policy on public.condominium_join_requests
for insert to authenticated
with check (
    profile_id = auth.uid()
    and created_by = auth.uid()
);

-- UPDATE: Only condominium admins can approve/decline requests
drop policy if exists join_requests_update_policy on public.condominium_join_requests;
create policy join_requests_update_policy on public.condominium_join_requests
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
grant select, insert, update on public.condominium_join_requests to authenticated;
