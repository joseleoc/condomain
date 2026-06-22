import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { StructuresListComponent } from './structures-list.component';
import type { Structure } from '@app-types/structures';

@Component({
  template: `
    <app-structures-list
      [structures]="structures()"
      [isLoading]="isLoading()"
      [error]="error()"
      [isAdmin]="isAdmin()"
      [isOnline]="isOnline()"
      (deleteStructure)="onDeleteStructure($event)"
      (refresh)="onRefresh($event)"
    />
  `,
  standalone: true,
  imports: [StructuresListComponent, SharedTestingModule],
})
class TestHostComponent {
  structures = signal<Structure[]>([]);
  isLoading = signal(false);
  error = signal<Error | null>(null);
  isAdmin = signal(false);
  isOnline = signal(true);
  onDeleteStructure = jasmine.createSpy('onDeleteStructure');
  onRefresh = jasmine.createSpy('onRefresh');
}

describe('StructuresListComponent', () => {
  let host: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  const mockStructures: Structure[] = [
    {
      id: '1',
      name: 'Torre A',
      description: 'Main tower',
      condominium_id: 'condo-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      deleted_at: null,
    },
    {
      id: '2',
      name: 'Torre B',
      description: null,
      condominium_id: 'condo-1',
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

  it('should show empty state when no structures', () => {
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

  it('should render structures list when data available', () => {
    host.structures.set(mockStructures);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('ion-item');
    expect(items.length).toBe(2);
  });

  it('should hide delete buttons when not admin', () => {
    host.structures.set(mockStructures);
    host.isAdmin.set(false);
    fixture.detectChanges();

    const deleteButtons = fixture.nativeElement.querySelectorAll('ion-button[color="danger"]');
    expect(deleteButtons.length).toBe(0);
  });

  it('should show delete buttons when admin', () => {
    host.structures.set(mockStructures);
    host.isAdmin.set(true);
    fixture.detectChanges();

    const deleteButtons = fixture.nativeElement.querySelectorAll('ion-button[color="danger"]');
    expect(deleteButtons.length).toBe(2);
  });

  it('should emit deleteStructure when delete button clicked', () => {
    host.structures.set(mockStructures);
    host.isAdmin.set(true);
    fixture.detectChanges();

    const deleteButton = fixture.nativeElement.querySelector('ion-button[color="danger"]');
    deleteButton.click();

    expect(host.onDeleteStructure).toHaveBeenCalledWith(mockStructures[0]);
  });

  it('should emit refresh when refresher triggered', () => {
    const child = fixture.debugElement.children[0].componentInstance as StructuresListComponent;
    const mockEvent = { target: { complete: () => {} } };
    child.onRefresh(mockEvent as unknown as Event);

    expect(host.onRefresh).toHaveBeenCalled();
  });
});
