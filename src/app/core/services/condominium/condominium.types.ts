import { type Condominium } from '@app-types/condominium';

export type CreateCondominiumData = Required<Pick<Condominium, 'name' | 'owner_id'>> &
  Partial<Pick<Condominium, 'address' | 'currency'>> & {
    /** Avatar file to store */
    avatar?: File | null;
  };

export type UpdateCondominiumData = Partial<
  Pick<Condominium, 'name' | 'address' | 'currency'>
> & {
  /** Avatar file to store */
  avatar?: File | null;
};
