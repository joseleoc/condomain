import type { CondominiumAccount, CreateCondominiumAccountData } from './condominium-accounts';

describe('CondominiumAccount types', () => {
  it('accepts a valid full account shape', () => {
    const account: CondominiumAccount = {
      id: '00000000-0000-0000-0000-000000000001',
      condominium_id: '00000000-0000-0000-0000-000000000002',
      name: 'Primary Bank Account',
      account_type: 'bank',
      currency: 'USD',
      institution_name: 'Example Bank',
      initial_balance: 1000.0,
      current_balance: 1000.0,
      icon: 'card',
      color: '#ff8200',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      deleted_at: null,
    };

    expect(account).toBeTruthy();
  });

  it('accepts a soft-deleted account', () => {
    const account: CondominiumAccount = {
      id: '00000000-0000-0000-0000-000000000001',
      condominium_id: '00000000-0000-0000-0000-000000000002',
      name: 'Closed Wallet',
      account_type: 'wallet',
      currency: 'VES',
      institution_name: null,
      initial_balance: 0,
      current_balance: 0,
      icon: null,
      color: null,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      deleted_at: '2026-07-02T00:00:00Z',
    };

    expect(account.deleted_at).toBe('2026-07-02T00:00:00Z');
  });

  it('accepts valid create data', () => {
    const data: CreateCondominiumAccountData = {
      condominium_id: '00000000-0000-0000-0000-000000000002',
      name: 'Petty Cash',
      account_type: 'cash',
      currency: 'USD',
      institution_name: null,
      initial_balance: 50,
      icon: 'cash',
      color: '#00aa00',
    };

    expect(data.name).toBe('Petty Cash');
  });
});
