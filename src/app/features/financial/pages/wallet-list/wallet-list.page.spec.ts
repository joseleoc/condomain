import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { WalletListPage } from './wallet-list.page';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { ContextService } from '@core/services/context/context.service';
import { Toast } from '@core/services/toast/toast';
import { BehaviorSubject } from 'rxjs';
import { signal, Signal } from '@angular/core';
import type { CondominiumAccount } from '@app-types/condominium-accounts';
import type { CondominiumWithRole } from '@app-types/condominium';

function createMockAccountsService(): CondominiumAccounts {
  return {
    accounts$: new BehaviorSubject<CondominiumAccount[]>([]),
    loading$: new BehaviorSubject<boolean>(false),
    error$: new BehaviorSubject<unknown>(null),
    fetchByCondominium: jasmine
      .createSpy('fetchByCondominium')
      .and.returnValue(Promise.resolve([])),
    getById: jasmine.createSpy('getById').and.returnValue(Promise.resolve(null)),
    create: jasmine.createSpy('create').and.returnValue(Promise.resolve({})),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
  } as unknown as CondominiumAccounts;
}

function createMockContextService(
  activeCondo: CondominiumWithRole | null = null,
): ContextService {
  return {
    activeCondominium: signal(activeCondo) as Signal<CondominiumWithRole | null>,
    isAdmin: signal(true) as Signal<boolean>,
    isReady: signal(true) as Signal<boolean>,
  } as unknown as ContextService;
}

function createMockToast(): Toast {
  return {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
  } as unknown as Toast;
}

describe('WalletListPage', () => {
  let component: WalletListPage;
  let fixture: ComponentFixture<WalletListPage>;
  let accountsService: CondominiumAccounts;
  let toast: Toast;

  const mockCondominium: CondominiumWithRole = {
    id: 'condo-1',
    name: 'Test Condominium',
    address: '123 Test St',
    currency: 'USD',
    owner_id: 'owner-1',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    role_id: 'role-1',
  };

  const mockAccount: CondominiumAccount = {
    id: 'wallet-1',
    condominium_id: 'condo-1',
    name: 'Main Account',
    account_type: 'bank',
    currency: 'USD',
    institution_name: 'Test Bank',
    initial_balance: 1000,
    current_balance: 1200,
    icon: null,
    color: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletListPage, SharedTestingModule],
      providers: [
        { provide: CondominiumAccounts, useFactory: createMockAccountsService },
        {
          provide: ContextService,
          useFactory: () => createMockContextService(mockCondominium),
        },
        { provide: Toast, useFactory: createMockToast },
      ],
    }).compileComponents();

    accountsService = TestBed.inject(CondominiumAccounts);
    toast = TestBed.inject(Toast);

    fixture = TestBed.createComponent(WalletListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch accounts when active condominium changes', () => {
    expect(accountsService.fetchByCondominium).toHaveBeenCalledWith('condo-1');
  });

  it('should show loading state', () => {
    accountsService.loading$.next(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('ion-spinner')).toBeTruthy();
  });

  it('should show empty state when no accounts', () => {
    accountsService.accounts$.next([]);
    accountsService.loading$.next(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('financial.wallets.emptyList');
  });

  it('should show wallet cards when accounts exist', () => {
    accountsService.accounts$.next([mockAccount]);
    accountsService.loading$.next(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Main Account');
    expect(compiled.querySelector('app-wallet-card')).toBeTruthy();
  });

  it('should show error state', () => {
    accountsService.error$.next(new Error('Fetch failed'));
    accountsService.loading$.next(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('common.error');
  });

  it('should open form modal on FAB click', () => {
    component.openCreateModal();
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.accountToEdit()).toBeNull();
  });

  it('should open form modal in edit mode when edit is triggered', () => {
    component.openEditModal(mockAccount);
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.accountToEdit()?.id).toBe('wallet-1');
  });

  it('should set delete target when delete is requested', () => {
    component.confirmDelete(mockAccount);
    expect(component.deleteTarget()?.id).toBe('wallet-1');
  });

  it('should call delete service when delete is confirmed', async () => {
    component.confirmDelete(mockAccount);
    await component.executeDelete();

    expect(accountsService.delete).toHaveBeenCalledWith('wallet-1');
  });

  it('should show toast after successful delete', async () => {
    component.confirmDelete(mockAccount);
    await component.executeDelete();

    expect(toast.present).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'financial.wallets.toast.deleted',
        color: 'success',
      }),
    );
  });

  it('should clear delete target after delete', async () => {
    component.confirmDelete(mockAccount);
    await component.executeDelete();

    expect(component.deleteTarget()).toBeNull();
  });
});
