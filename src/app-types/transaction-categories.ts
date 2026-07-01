export interface TransactionCategory {
  id: string;
  condominium_id: string;
  parent_id: string | null;
  name: string;
  category_type: 'income' | 'expense';
  icon: string | null;
  color: string | null;
  is_system: boolean;
  i18n_key: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CategoryTreeNode extends TransactionCategory {
  children: TransactionCategory[];
}

export type CreateTransactionCategoryData = Pick<
  TransactionCategory,
  'condominium_id' | 'parent_id' | 'name' | 'category_type' | 'icon' | 'color'
>;
