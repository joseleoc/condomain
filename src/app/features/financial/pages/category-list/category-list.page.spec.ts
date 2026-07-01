import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { CategoryListPage } from './category-list.page';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { ContextService } from '@core/services/context/context.service';
import { Toast } from '@core/services/toast/toast';
import { BehaviorSubject } from 'rxjs';
import { signal, Signal } from '@angular/core';
import type { CategoryTreeNode, TransactionCategory } from '@app-types/transaction-categories';
import type { CondominiumWithRole } from '@app-types/condominium';
import { CategoryGroupComponent } from '../../components/category-group/category-group.component';
import { CategoryFormModalComponent } from '../../components/category-form-modal/category-form-modal.component';

function createMockCategoriesService(): TransactionCategories {
  return {
    categories$: new BehaviorSubject<TransactionCategory[]>([]),
    loading$: new BehaviorSubject<boolean>(false),
    error$: new BehaviorSubject<unknown>(null),
    fetchByCondominium: jasmine
      .createSpy('fetchByCondominium')
      .and.returnValue(Promise.resolve([])),
    fetchByType: jasmine.createSpy('fetchByType').and.returnValue(Promise.resolve([])),
    fetchChildren: jasmine.createSpy('fetchChildren').and.returnValue(Promise.resolve([])),
    create: jasmine.createSpy('create').and.returnValue(Promise.resolve({} as TransactionCategory)),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
  } as unknown as TransactionCategories;
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

describe('CategoryListPage', () => {
  let component: CategoryListPage;
  let fixture: ComponentFixture<CategoryListPage>;
  let categoriesService: TransactionCategories;
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

  const mockTreeNodes: CategoryTreeNode[] = [
    {
      id: 'root-1',
      condominium_id: 'condo-1',
      parent_id: null,
      name: 'Maintenance',
      category_type: 'expense',
      icon: null,
      color: null,
      is_system: true,
      i18n_key: 'maintenance',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      children: [
        {
          id: 'child-1',
          condominium_id: 'condo-1',
          parent_id: 'root-1',
          name: 'Repairs',
          category_type: 'expense',
          icon: null,
          color: null,
          is_system: true,
          i18n_key: 'repairs',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        },
      ],
    },
    {
      id: 'root-2',
      condominium_id: 'condo-1',
      parent_id: null,
      name: 'Custom',
      category_type: 'expense',
      icon: null,
      color: null,
      is_system: false,
      i18n_key: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      children: [],
    },
  ];

  const mockUserCategory: TransactionCategory = {
    id: 'cat-user',
    condominium_id: 'condo-1',
    parent_id: null,
    name: 'User Category',
    category_type: 'expense',
    icon: null,
    color: null,
    is_system: false,
    i18n_key: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const mockSystemCategory: TransactionCategory = {
    id: 'cat-system',
    condominium_id: 'condo-1',
    parent_id: null,
    name: 'System Category',
    category_type: 'expense',
    icon: null,
    color: null,
    is_system: true,
    i18n_key: 'system_category',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryListPage, SharedTestingModule],
      providers: [
        {
          provide: TransactionCategories,
          useFactory: createMockCategoriesService,
        },
        {
          provide: ContextService,
          useFactory: () => createMockContextService(mockCondominium),
        },
        { provide: Toast, useFactory: createMockToast },
      ],
    }).compileComponents();

    categoriesService = TestBed.inject(TransactionCategories);
    toast = TestBed.inject(Toast);

    fixture = TestBed.createComponent(CategoryListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch expense categories when active condominium changes', () => {
    expect(categoriesService.fetchByType).toHaveBeenCalledWith(
      'condo-1',
      'expense',
    );
  });

  it('should fetch income categories when tab changes', () => {
    component.selectedType.set('income');
    fixture.detectChanges();

    expect(categoriesService.fetchByType).toHaveBeenCalledWith(
      'condo-1',
      'income',
    );
  });

  it('should show loading state', () => {
    categoriesService.loading$.next(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('ion-spinner')).toBeTruthy();
  });

  it('should show empty state when no categories', () => {
    component.categoryTree.set([]);
    categoriesService.loading$.next(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('financial.categories.emptyList');
  });

  it('should show category groups when tree has nodes', () => {
    component.categoryTree.set(mockTreeNodes);
    categoriesService.loading$.next(false);
    fixture.detectChanges();

    const groups = fixture.debugElement.queryAll(
      By.directive(CategoryGroupComponent),
    );
    expect(groups.length).toBe(2);
  });

  it('should show error state', () => {
    categoriesService.error$.next(new Error('Fetch failed'));
    categoriesService.loading$.next(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('common.error');
  });

  it('should open form modal on FAB click', () => {
    component.openCreateModal();
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.categoryToEdit()).toBeNull();
  });

  it('should open form modal in edit mode when edit is triggered', () => {
    component.openEditModal(mockUserCategory);
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.categoryToEdit()?.id).toBe('cat-user');
  });

  it('should set delete target when delete is requested', () => {
    component.confirmDelete(mockUserCategory);
    expect(component.deleteTarget()?.id).toBe('cat-user');
  });

  it('should block delete target for system categories', () => {
    component.confirmDelete(mockSystemCategory);
    expect(component.deleteTarget()).toBeNull();
    expect(toast.present).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'financial.categories.toast.systemError',
        color: 'danger',
      }),
    );
  });

  it('should call delete service when delete is confirmed', async () => {
    component.confirmDelete(mockUserCategory);
    await component.executeDelete();

    expect(categoriesService.delete).toHaveBeenCalledWith('cat-user');
  });

  it('should show toast after successful delete', async () => {
    component.confirmDelete(mockUserCategory);
    await component.executeDelete();

    expect(toast.present).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'financial.categories.toast.deleted',
        color: 'success',
      }),
    );
  });

  it('should clear delete target after delete', async () => {
    component.confirmDelete(mockUserCategory);
    await component.executeDelete();

    expect(component.deleteTarget()).toBeNull();
  });

  it('should refetch categories after delete', async () => {
    component.confirmDelete(mockUserCategory);
    await component.executeDelete();

    expect(categoriesService.fetchByType).toHaveBeenCalledWith(
      'condo-1',
      'expense',
    );
  });
});
