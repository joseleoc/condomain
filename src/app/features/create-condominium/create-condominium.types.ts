import { Structure } from '@app-types/structures';

export type CreateCondominiumProcessOptions = 'simple' | 'massive' | 'ai';

export type LocalStructure = Pick<Structure, 'name' | 'description'>;
