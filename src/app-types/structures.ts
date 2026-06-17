export interface Structure {
  id: string;
  name: string;
  description: string | null;
  condominium_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CreateStructureData = Pick<
  Structure,
  'name' | 'description' | 'condominium_id'
>;
