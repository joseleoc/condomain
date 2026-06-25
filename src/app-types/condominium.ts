export interface Condominium {
  id: string;
  name: string;
  /** The address to display in the UI */
  address?: string | null;
  /** The avatar id only */
  avatar?: string;
  /** Currency ISO Code which references the currencies table */
  currency: string;
  owner_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CondominiumWithRole extends Condominium {
  role_id: string;
}