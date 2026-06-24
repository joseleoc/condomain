import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { PropertiesListComponent } from './properties-list.component';
import type { Property } from '@app-types/property';

@Component({
  template: `
    <app-properties-list
      [properties]="properties()"
      [isLoading]="isLoading()"
      [error]="error()"
      [isAdmin]="isAdmin()"
      [isOnline]="isOnline()"
      [structureNameMap]="structureNameMap()"
      (deleteProperty)="onDeleteProperty($event)"
      (refresh)="onRefresh($event)"
    />
  `,
  standalone: true,
  imports: [PropertiesListComponent, SharedTestingModule],
})
class TestHostComponent {
  properties = signal<Property[]>([]);
  isLoading = signal(false);
  error = signal<Error | null>(null);
  isAdmin = signal(false);
  isOnline = signal(true);
  structureNameMap = signal<Map<string, string>>(new Map());
  onDeleteProperty = jasmine.createSpy('onDeleteProperty');
  onRefresh = jasmine.createSpy('onRefresh');
}

describe('PropertiesListComponent', () => {
  let host: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  const mockProperties: Property[] = [
    {
      id: '1',
      name: 'Apt 101',
      condominium_id: 'condo-1',
      structure_id: 'struct-1',
      owner_name: 'John Doe',
      owner_email: 'john@example.com',
      description: null,
      share_percentage: 10,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      deleted_at: null,
    },
    {
      id: '2',
      name: 'Apt 102',
      condominium_id: 'condo-1',
      structure_id: 'struct-1',
      owner_name: null,
      owner_email: null,
      description: null,
      share_percentage: 15,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      deleted_at: null,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(host).toBeTruthy();
  });

  it('should show empty state when no properties', () => {
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should show skeleton when loading', () => {
    host.isLoading.set(true);
    fixture.detectChanges();

    const skeletons = fixture.nativeElement.querySelectorAll('ion-skeleton-text');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show error state when error present', () => {
    host.error.set(new Error('Network error'));
    fixture.detectChanges();

    const errorState = fixture.nativeElement.querySelector('.error-state');
    expect(errorState).toBeTruthy();
  });

  it('should render properties list when data available', () => {
    host.properties.set(mockProperties);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('ion-item');
    expect(items.length).toBe(2);
  });

  it('should hide delete buttons when not admin', () => {
    host.properties.set(mockProperties);
    host.isAdmin.set(false);
    fixture.detectChanges();

    const deleteButtons = fixture.nativeElement.querySelectorAll('ion-button[color="danger"]');
    expect(deleteButtons.length).toBe(0);
  });

  it('should show delete buttons when admin', () => {
    host.properties.set(mockProperties);
    host.isAdmin.set(true);
    fixture.detectChanges();

    const deleteButtons = fixture.nativeElement.querySelectorAll('ion-button[color="danger"]');
    expect(deleteButtons.length).toBe(2);
  });

  it('should emit deleteProperty when delete button clicked', () => {
    host.properties.set(mockProperties);
    host.isAdmin.set(true);
    fixture.detectChanges();

    const deleteButton = fixture.nativeElement.querySelector('ion-button[color="danger"]');
    deleteButton.click();

    expect(host.onDeleteProperty).toHaveBeenCalledWith(mockProperties[0]);
  });

  it('should return dash when structure not found in map', () => {
    const child = fixture.debugElement.children[0].componentInstance as PropertiesListComponent;
    host.structureNameMap.set(new Map());
    fixture.detectChanges();

    const result = child.getStructureName('non-existent');
    expect(result).toBe('—');
  });

  it('should return structure name when found in map', () => {
    const child = fixture.debugElement.children[0].componentInstance as PropertiesListComponent;
    const map = new Map<string, string>();
    map.set('struct-1', 'Torre A');
    host.structureNameMap.set(map);
    fixture.detectChanges();

    const result = child.getStructureName('struct-1');
    expect(result).toBe('Torre A');
  });
});
