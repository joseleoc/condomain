import type {
  CategoryTreeNode,
  CreateTransactionCategoryData,
  TransactionCategory,
} from './transaction-categories';

describe('TransactionCategory types', () => {
  it('accepts a valid root category', () => {
    const category: TransactionCategory = {
      id: '00000000-0000-0000-0000-000000000001',
      condominium_id: '00000000-0000-0000-0000-000000000002',
      parent_id: null,
      name: 'Maintenance',
      category_type: 'expense',
      icon: 'construct',
      color: '#ff8200',
      is_system: true,
      i18n_key: 'maintenance',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      deleted_at: null,
    };

    expect(category.parent_id).toBeNull();
  });

  it('accepts a valid child category', () => {
    const category: TransactionCategory = {
      id: '00000000-0000-0000-0000-000000000003',
      condominium_id: '00000000-0000-0000-0000-000000000002',
      parent_id: '00000000-0000-0000-0000-000000000001',
      name: 'Repairs',
      category_type: 'expense',
      icon: 'hammer',
      color: '#ff8200',
      is_system: true,
      i18n_key: 'maintenance_repairs',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      deleted_at: null,
    };

    expect(category.parent_id).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('accepts a category tree node', () => {
    const node: CategoryTreeNode = {
      id: '00000000-0000-0000-0000-000000000001',
      condominium_id: '00000000-0000-0000-0000-000000000002',
      parent_id: null,
      name: 'Maintenance',
      category_type: 'expense',
      icon: 'construct',
      color: '#ff8200',
      is_system: true,
      i18n_key: 'maintenance',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      deleted_at: null,
      children: [
        {
          id: '00000000-0000-0000-0000-000000000003',
          condominium_id: '00000000-0000-0000-0000-000000000002',
          parent_id: '00000000-0000-0000-0000-000000000001',
          name: 'Repairs',
          category_type: 'expense',
          icon: 'hammer',
          color: '#ff8200',
          is_system: true,
          i18n_key: 'maintenance_repairs',
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
          deleted_at: null,
        },
      ],
    };

    expect(node.children.length).toBe(1);
  });

  it('accepts valid create data', () => {
    const data: CreateTransactionCategoryData = {
      condominium_id: '00000000-0000-0000-0000-000000000002',
      parent_id: null,
      name: 'Custom Income',
      category_type: 'income',
      icon: 'cash',
      color: '#00aa00',
    };

    expect(data.category_type).toBe('income');
  });
});
