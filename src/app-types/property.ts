export interface Property {
  id: string;
  condominium_id: string;
  structure_id: string;
  name: string;
  share_percentage: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CreatePropertyData = Pick<
  Property,
  'name' | 'share_percentage' | 'condominium_id' | 'structure_id'
>;
