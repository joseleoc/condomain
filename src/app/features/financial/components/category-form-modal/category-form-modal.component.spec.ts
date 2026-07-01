import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { CategoryFormModalComponent } from './category-form-modal.component';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Toast } from '@core/services/toast/toast';
import { BehaviorSubject } from 'rxjs';
import type { TransactionCategory } from '@app-types/transaction-categories';

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
    create: jasmine.createSpy('create').and.callFake(
      (data: Record<string, unknown>) =>
        Promise.resolve({
          id: 'new-cat-id',
          ...data,
          is_system: false,
          i18n_key: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        }),
    ),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
  } as unknown as TransactionCategories;
}

function createMockToast(): Toast {
  return {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
  } as unknown as Toast;
}

describe('CategoryFormModalComponent', () => {
  let component: CategoryFormModalComponent;
  let fixture: ComponentFixture<CategoryFormModalComponent>;
  let categoriesService: TransactionCategories;
  let toast: Toast;

  const mockRootIncome: TransactionCategory = {
    id: 'root-income',
    condominium_id: 'condo-1',
    parent_id: null,
    name: 'Fees',
    category_type: 'income',
    icon: null,
    color: null,
    is_system: true,
    i18n_key: 'fees',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const mockRootExpense: TransactionCategory = {
    id: 'root-expense',
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
  };

  const mockChildExpense: TransactionCategory = {
    id: 'child-expense',
    condominium_id: 'condo-1',
    parent_id: 'root-expense',
    name: 'Repairs',
    category_type: 'expense',
    icon: null,
    color: null,
    is_system: true,
    i18n_key: 'repairs',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const mockCategory: TransactionCategory = {
    id: 'cat-1',
    condominium_id: 'condo-1',
    parent_id: 'root-expense',
    name: 'Custom Category',
    category_type: 'expense',
    icon: 'cash',
    color: '#ff8200',
    is_system: false,
    i18n_key: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryFormModalComponent, SharedTestingModule],
      providers: [
        {
          provide: TransactionCategories,
          useFactory: createMockCategoriesService,
        },
        { provide: Toast, useFactory: createMockToast },
      ],
    }).compileComponents();

    categoriesService = TestBed.inject(TransactionCategories);
    toast = TestBed.inject(Toast);

    fixture = TestBed.createComponent(CategoryFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch categories when opened', () => {
    expect(categoriesService.fetchByCondominium).toHaveBeenCalledWith('condo-1');
  });

  describe('create mode', () => {
    it('should initialize form with default values', () => {
      expect(component.form.value.name).toBe('');
      expect(component.form.value.category_type).toBe('expense');
      expect(component.form.value.parent_id).toBeNull();
      expect(component.form.value.icon).toBeNull();
      expect(component.form.value.color).toBeNull();
    });

    it('should require name', () => {
      component.form.patchValue({ name: '' });
      expect(component.form.valid).toBe(false);
      expect(component.form.controls.name.hasError('required')).toBe(true);
    });

    it('should call create service on valid submit', async () => {
      component.form.patchValue({
        name: 'New Category',
        category_type: 'expense',
        parent_id: null,
      });

      await component.submit();

      expect(categoriesService.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          condominium_id: 'condo-1',
          name: 'New Category',
          category_type: 'expense',
          parent_id: null,
        }),
      );
    });

    it('should dismiss modal after successful create', async () => {
      spyOn(component.isOpenChange, 'emit');
      component.form.patchValue({ name: 'New Category' });

      await component.submit();

      expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
    });

    it('should show created toast after successful create', async () => {
      component.form.patchValue({ name: 'New Category' });

      await component.submit();

      expect(toast.present).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'financial.categories.toast.created',
          color: 'success',
        }),
      );
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('category', mockCategory);
      fixture.detectChanges();
    });

    it('should initialize form with category values', () => {
      expect(component.form.value.name).toBe('Custom Category');
      expect(component.form.value.category_type).toBe('expense');
      expect(component.form.value.parent_id).toBe('root-expense');
      expect(component.form.value.icon).toBe('cash');
      expect(component.form.value.color).toBe('#ff8200');
    });

    it('should call update service on valid submit', async () => {
      component.form.patchValue({ name: 'Updated Category' });

      await component.submit();

      expect(categoriesService.update).toHaveBeenCalledWith(
        'cat-1',
        jasmine.objectContaining({
          name: 'Updated Category',
          category_type: 'expense',
          parent_id: 'root-expense',
          icon: 'cash',
          color: '#ff8200',
        }),
      );
    });

    it('should dismiss modal after successful update', async () => {
      spyOn(component.isOpenChange, 'emit');
      await component.submit();

      expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
    });

    it('should show updated toast after successful update', async () => {
      await component.submit();

      expect(toast.present).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'financial.categories.toast.updated',
          color: 'success',
        }),
      );
    });
  });

  describe('parent selector', () => {
    beforeEach(() => {
      categoriesService.categories$.next([
        mockRootIncome,
        mockRootExpense,
        mockChildExpense,
      ]);
      fixture.detectChanges();
    });

    it('should include only root categories of the selected type', () => {
      const parents = component.availableParentCategories();
      expect(parents.length).toBe(1);
      expect(parents[0].id).toBe('root-expense');
    });

    it('should update parent options when type changes', () => {
      component.form.patchValue({ category_type: 'income' });
      fixture.detectChanges();

      const parents = component.availableParentCategories();
      expect(parents.length).toBe(1);
      expect(parents[0].id).toBe('root-income');
    });

    it('should reset parent_id when type changes', () => {
      component.form.patchValue({
        category_type: 'expense',
        parent_id: 'root-expense',
      });
      component.form.patchValue({ category_type: 'income' });
      fixture.detectChanges();

      expect(component.form.value.parent_id).toBeNull();
    });
  });

  describe('hierarchy validation', () => {
    it('should show hierarchyError toast when create rejects 3rd level', async () => {
      categoriesService.create = jasmine
        .createSpy('create')
        .and.returnValue(
          Promise.reject(new Error('Categories can only be nested two levels deep')),
        );

      component.form.patchValue({ name: 'Too Deep' });
      await component.submit();

      expect(toast.present).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'financial.categories.toast.hierarchyError',
          color: 'danger',
        }),
      );
    });
  });

  describe('invalid submit', () => {
    it('should not call service when form is invalid', async () => {
      component.form.patchValue({ name: '' });
      await component.submit();

      expect(categoriesService.create).not.toHaveBeenCalled();
      expect(categoriesService.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should emit isOpenChange false', () => {
      spyOn(component.isOpenChange, 'emit');
      component.cancel();
      expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
    });
  });
});
