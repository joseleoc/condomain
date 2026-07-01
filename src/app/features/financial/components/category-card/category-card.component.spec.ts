import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { CategoryCardComponent } from './category-card.component';
import type { TransactionCategory } from '@app-types/transaction-categories';

function createMockCategory(
  overrides: Partial<TransactionCategory> = {},
): TransactionCategory {
  return {
    id: 'cat-1',
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
    ...overrides,
  };
}

describe('CategoryCardComponent', () => {
  let component: CategoryCardComponent;
  let fixture: ComponentFixture<CategoryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CategoryCardComponent,
        SharedTestingModule,
        TranslocoTestingModule.forRoot({
          langs: {
            es: {
              'financial.categories.system.maintenance': 'Mantenimiento',
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

    fixture = TestBed.createComponent(CategoryCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('category', createMockCategory());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user category name', () => {
    fixture.componentRef.setInput(
      'category',
      createMockCategory({ name: 'Custom Category' }),
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Custom Category');
  });

  it('should display translated system category name', () => {
    fixture.componentRef.setInput(
      'category',
      createMockCategory({
        name: 'maintenance',
        is_system: true,
        i18n_key: 'maintenance',
      }),
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Mantenimiento');
  });

  it('should identify system categories', () => {
    fixture.componentRef.setInput(
      'category',
      createMockCategory({ is_system: true, i18n_key: 'maintenance' }),
    );
    fixture.detectChanges();

    expect(component.isSystem()).toBe(true);
  });

  it('should show lock indicator for system categories', () => {
    fixture.componentRef.setInput(
      'category',
      createMockCategory({ is_system: true, i18n_key: 'maintenance' }),
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.system-lock')).toBeTruthy();
  });

  it('should hide lock indicator for user categories', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.system-lock')).toBeFalsy();
  });

  it('should allow editing when editable and user category', () => {
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();

    expect(component.canEdit()).toBe(true);
  });

  it('should disallow editing for system categories even if editable is true', () => {
    fixture.componentRef.setInput(
      'category',
      createMockCategory({ is_system: true, i18n_key: 'maintenance' }),
    );
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();

    expect(component.canEdit()).toBe(false);
  });

  it('should disallow editing when editable is false', () => {
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();

    expect(component.canEdit()).toBe(false);
  });

  it('should emit edit event', () => {
    spyOn(component.edit, 'emit');
    component.onEdit();
    expect(component.edit.emit).toHaveBeenCalled();
  });

  it('should emit delete event', () => {
    spyOn(component.delete, 'emit');
    component.onDelete();
    expect(component.delete.emit).toHaveBeenCalled();
  });

  it('should map provided icon', () => {
    fixture.componentRef.setInput(
      'category',
      createMockCategory({ icon: 'cash' }),
    );
    fixture.detectChanges();

    expect(component.iconName()).toBe('cash');
  });

  it('should use default icon when none provided', () => {
    fixture.componentRef.setInput(
      'category',
      createMockCategory({ icon: null }),
    );
    fixture.detectChanges();

    expect(component.iconName()).toBe('folder-outline');
  });

  it('should apply category color as background', () => {
    fixture.componentRef.setInput(
      'category',
      createMockCategory({ color: '#ff0000' }),
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('.category-card') as HTMLElement;
    expect(card.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });
});
