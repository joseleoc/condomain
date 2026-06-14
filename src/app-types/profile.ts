export interface Profile {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
}
