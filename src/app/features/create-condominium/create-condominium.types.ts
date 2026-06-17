import { Structure } from '@app-types/structures';



export interface CreatePropertyFormData {
  number: string;
  fee: number;
  structure: string;
}

export type CreateCondominiumProcessOptions = 'simple' | 'massive' | 'ai';

export type LocalStructure = Pick<Structure, 'name' | 'description'> & {
  properties: CreatePropertyFormData[];
  id?: string;
};
