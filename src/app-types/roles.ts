export type RoleName =
  | 'condominium_admin'
  | 'admin_operator'
  | 'resident_owner';

export interface Role {
  id: string;
  name: RoleName;
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
