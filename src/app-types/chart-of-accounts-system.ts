export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export interface ChartOfAccountsSystem {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  name_en: string | null;
  type: AccountType;
  description: string | null;
  description_en: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChartOfAccountsSystemData {
  parent_id?: string | null;
  code: string;
  name: string;
  name_en?: string | null;
  type: AccountType;
  description?: string | null;
  description_en?: string | null;
}

export interface ChartOfAccountsSystemTreeNode extends ChartOfAccountsSystem {
  children: ChartOfAccountsSystem[];
}
