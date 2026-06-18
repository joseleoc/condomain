import { Structure } from '@app-types/structures';

export interface CreatePropertyFormData {
  number: string;
  fee: number;
  structure: string;
  ownerName: string | null;
  ownerEmail: string | null;
}

export type CreateCondominiumProcessOptions = 'simple' | 'massive' | 'ai';

export type LocalStructure = Pick<Structure, 'name' | 'description'> & {
  properties: CreatePropertyFormData[];
  id?: string;
};

export interface PropertyWithStructure extends CreatePropertyFormData {
  structureName: string;
}
