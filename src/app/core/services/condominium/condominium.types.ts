import { type Condominium } from '@app-types/condominium';

export type CreateCondominiumData = Required<
  Pick<Condominium, 'name' | 'owner_id'>
> &
  Partial<Pick<Condominium, 'address' | 'avatar' | 'currency'>>;
