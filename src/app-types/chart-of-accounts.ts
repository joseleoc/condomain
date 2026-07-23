import type { AccountType } from './chart-of-accounts-system';

export interface ChartOfAccounts {
  id: string;
  condominium_id: string;
  system_account_id: string | null;
  parent_id: string | null;
  code: string;
  name: string;
  name_en: string | null;
  type: AccountType;
  is_system_defined: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateChartOfAccountsData {
  condominium_id: string;
  system_account_id?: string | null;
  parent_id?: string | null;
  code: string;
  name: string;
  name_en?: string | null;
  type: AccountType;
}

export interface ChartOfAccountsTreeNode extends ChartOfAccounts {
  children: ChartOfAccounts[];
}
