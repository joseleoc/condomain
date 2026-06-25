-- Add property_id column to profile_condominiums table
-- This allows assigning a specific property to a user when they join a condominium

alter table public.profile_condominiums
add column if not exists property_id uuid references public.properties(id) on delete set null;

comment on column public.profile_condominiums.property_id is 'Optional property assignment for the user in this condominium.';

-- Create index for property_id
create index if not exists idx_profile_condominiums_property_id
    on public.profile_condominiums (property_id)
    where deleted_at is null;
