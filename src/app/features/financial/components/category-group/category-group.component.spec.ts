import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { CategoryGroupComponent } from './category-group.component';
import { CategoryCardComponent } from '../category-card/category-card.component';
import type {
  CategoryTreeNode,
  TransactionCategory,
} from '@app-types/transaction-categories';

function createMockTreeNode(
  overrides: Partial<CategoryTreeNode> = {},
): CategoryTreeNode {
  return {
    id: 'root-1',
    condominium_id: 'condo-1',
    parent_id: null,
    name: 'Root Category',
    category_type: 'expense',
    icon: 'settings',
    color: '#ff8200',
    is_system: true,
    i18n_key: 'maintenance',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    children: [],
    ...overrides,
  };
}

describe('CategoryGroupComponent', () => {
  let component: CategoryGroupComponent;
  let fixture: ComponentFixture<CategoryGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CategoryGroupComponent,
        CategoryCardComponent,
        SharedTestingModule,
        TranslocoTestingModule.forRoot({
          langs: {
            es: {
              'financial.categories.system.maintenance': 'Mantenimiento',
              'financial.categories.emptyList': 'No hay subcategorías',
            },
          },
          translocoConfig: {
            availableLangs: ['en', 'es'],
            defaultLang: 'es',
          },
          preloadLangs: false,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryGroupComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('node', createMockTreeNode());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display root category name', () => {
    fixture.componentRef.setInput(
      'node',
      createMockTreeNode({
        name: 'Expenses Group',
        is_system: false,
        i18n_key: null,
      }),
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Expenses Group');
  });

  it('should display translated system root name', () => {
    fixture.componentRef.setInput(
      'node',
      createMockTreeNode({
        name: 'maintenance',
        is_system: true,
        i18n_key: 'maintenance',
      }),
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Mantenimiento');
  });

  it('should use root icon', () => {
    fixture.componentRef.setInput(
      'node',
      createMockTreeNode({ icon: 'cash' }),
    );
    fixture.detectChanges();

    expect(component.rootIcon()).toBe('cash');
  });

  it('should render child category cards', () => {
    fixture.componentRef.setInput(
      'node',
      createMockTreeNode({
        children: [
          {
            id: 'child-1',
            condominium_id: 'condo-1',
            parent_id: 'root-1',
            name: 'Child One',
            category_type: 'expense',
            icon: null,
            color: null,
            is_system: false,
            i18n_key: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          } satisfies TransactionCategory,
          {
            id: 'child-2',
            condominium_id: 'condo-1',
            parent_id: 'root-1',
            name: 'Child Two',
            category_type: 'expense',
            icon: null,
            color: null,
            is_system: true,
            i18n_key: 'repairs',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          } satisfies TransactionCategory,
        ],
      }),
    );
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(
      By.directive(CategoryCardComponent),
    );
    expect(cards.length).toBe(2);
    expect(cards[0].componentInstance.category().name).toBe('Child One');
    expect(cards[1].componentInstance.category().name).toBe('Child Two');
  });

  it('should mark system children as not editable', () => {
    const systemChild = {
      id: 'child-sys',
      condominium_id: 'condo-1',
      parent_id: 'root-1',
      name: 'System Child',
      category_type: 'expense',
      icon: null,
      color: null,
      is_system: true,
      i18n_key: 'repairs',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    } as const;

    fixture.componentRef.setInput(
      'node',
      createMockTreeNode({ children: [systemChild] }),
    );
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.directive(CategoryCardComponent))
      .componentInstance as CategoryCardComponent;
    expect(card.editable()).toBe(false);
  });

  it('should mark user children as editable', () => {
    const userChild = {
      id: 'child-user',
      condominium_id: 'condo-1',
      parent_id: 'root-1',
      name: 'User Child',
      category_type: 'expense',
      icon: null,
      color: null,
      is_system: false,
      i18n_key: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    } as const;

    fixture.componentRef.setInput(
      'node',
      createMockTreeNode({ children: [userChild] }),
    );
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.directive(CategoryCardComponent))
      .componentInstance as CategoryCardComponent;
    expect(card.editable()).toBe(true);
  });

  it('should show empty message when there are no children', () => {
    fixture.componentRef.setInput('node', createMockTreeNode({ children: [] }));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No hay subcategorías');
  });

  it('should forward edit events from child cards', () => {
    spyOn(component.edit, 'emit');
    component.onChildEdit({ id: 'child-1' } as CategoryTreeNode);
    expect(component.edit.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'child-1' }),
    );
  });

  it('should forward delete events from child cards', () => {
    spyOn(component.delete, 'emit');
    component.onChildDelete({ id: 'child-1' } as CategoryTreeNode);
    expect(component.delete.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'child-1' }),
    );
  });
});
