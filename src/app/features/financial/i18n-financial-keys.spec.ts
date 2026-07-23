import es from '@assets/i18n/es.json';
import en from '@assets/i18n/en.json';

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

describe('Financial i18n keys', () => {
  const walletKeys = [
    'financial.wallets.title',
    'financial.wallets.emptyList',
    'financial.wallets.createButton',
    'financial.wallets.editButton',
    'financial.wallets.deleteButton',
    'financial.wallets.deleteConfirmTitle',
    'financial.wallets.deleteConfirmMessage',
    'financial.wallets.form.title',
    'financial.wallets.form.editTitle',
    'financial.wallets.form.name',
    'financial.wallets.form.namePlaceholder',
    'financial.wallets.form.type',
    'financial.wallets.form.currency',
    'financial.wallets.form.institution',
    'financial.wallets.form.institutionPlaceholder',
    'financial.wallets.form.balance',
    'financial.wallets.form.icon',
    'financial.wallets.form.color',
    'financial.wallets.form.save',
    'financial.wallets.form.cancel',
    'financial.wallets.accountType.bank',
    'financial.wallets.accountType.cash',
    'financial.wallets.accountType.wallet',
    'financial.wallets.accountType.credit',
    'financial.wallets.accountType.investment',
    'financial.wallets.toast.created',
    'financial.wallets.toast.updated',
    'financial.wallets.toast.deleted',
    'financial.wallets.toast.error',
  ];

  const categoryKeys = [
    'financial.categories.title',
    'financial.categories.incomeTab',
    'financial.categories.expenseTab',
    'financial.categories.emptyList',
    'financial.categories.createButton',
    'financial.categories.editButton',
    'financial.categories.deleteButton',
    'financial.categories.systemLock',
    'financial.categories.deleteConfirmTitle',
    'financial.categories.deleteConfirmMessage',
    'financial.categories.deleteSystemError',
    'financial.categories.hierarchyError',
    'financial.categories.form.title',
    'financial.categories.form.editTitle',
    'financial.categories.form.name',
    'financial.categories.form.namePlaceholder',
    'financial.categories.form.type',
    'financial.categories.form.parent',
    'financial.categories.form.parentRoot',
    'financial.categories.form.icon',
    'financial.categories.form.color',
    'financial.categories.form.save',
    'financial.categories.form.cancel',
    'financial.categories.toast.created',
    'financial.categories.toast.updated',
    'financial.categories.toast.deleted',
    'financial.categories.toast.systemError',
    'financial.categories.toast.hierarchyError',
    'financial.categories.toast.error',
  ];

  const systemCategoryI18nKeys = [
    'maintenance',
    'maintenance_common_areas',
    'maintenance_repairs',
    'services',
    'services_electricity',
    'services_water',
    'services_gas',
    'services_internet',
    'services_phone',
    'services_waste',
    'administration',
    'administration_fees',
    'administration_salaries',
    'security',
    'cleaning',
    'fees',
    'fees_monthly',
    'fees_extraordinary',
    'reserves',
    'other_income',
  ];

  const requiredPaths = [...walletKeys, ...categoryKeys];

  it('should define all required Spanish financial translations', () => {
    for (const path of requiredPaths) {
      const value = getPath(es, path);
      expect(value).withContext(path).toBeDefined();
      expect(typeof value).withContext(path).toBe('string');
    }
  });

  it('should define all required English financial translations', () => {
    for (const path of requiredPaths) {
      const value = getPath(en, path);
      expect(value).withContext(path).toBeDefined();
      expect(typeof value).withContext(path).toBe('string');
    }
  });

  it('should provide Spanish and English translations for every system category i18n_key', () => {
    for (const key of systemCategoryI18nKeys) {
      const esValue = getPath(es, `financial.categories.system.${key}`);
      const enValue = getPath(en, `financial.categories.system.${key}`);

      expect(esValue).withContext(`es: ${key}`).toBeDefined();
      expect(typeof esValue).withContext(`es: ${key}`).toBe('string');
      expect(enValue).withContext(`en: ${key}`).toBeDefined();
      expect(typeof enValue).withContext(`en: ${key}`).toBe('string');
    }
  });
});
