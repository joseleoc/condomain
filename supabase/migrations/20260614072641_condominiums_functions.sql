-- Verifica si un usuario pertenece activamente a un condominio
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
            and uc.deleted_at is null
    );
$$;

-- Verifica si un usuario posee alguno de los roles permitidos en el condominio
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
            and uc.deleted_at is null
            and r.name = any (p_role_names)
            and r.deleted_at is null
    );
$$;