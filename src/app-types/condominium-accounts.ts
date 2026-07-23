export interface CondominiumAccount {
  id: string;
  condominium_id: string;
  name: string;
  account_type: 'bank' | 'cash' | 'wallet' | 'credit' | 'investment';
  currency: string;
  institution_name: string | null;
  initial_balance: number;
  current_balance: number;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CreateCondominiumAccountData = Pick<
  CondominiumAccount,
  | 'condominium_id'
  | 'name'
  | 'account_type'
  | 'currency'
  | 'institution_name'
  | 'initial_balance'
  | 'icon'
  | 'color'
>;
