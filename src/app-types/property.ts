export interface Property {
  id: string;
  condominium_id: string;
  structure_id: string;
  name: string;
  owner_name?: string | null;
  owner_email?: string | null;
  description: string | null;
  share_percentage: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CreatePropertyData = Pick<
  Property,
  | 'name'
  | 'share_percentage'
  | 'condominium_id'
  | 'structure_id'
  | 'owner_name'
  | 'owner_email'
>;
