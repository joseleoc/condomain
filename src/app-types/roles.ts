export interface Role {
    id: string;
    name: 'condominium_admin' | 'admin_operator' | 'resident_owner';
    description?: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}