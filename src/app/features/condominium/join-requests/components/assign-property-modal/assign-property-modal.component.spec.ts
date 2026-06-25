import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { AssignPropertyModalComponent } from './assign-property-modal.component';
import type { Property } from '@app-types/property';

describe('AssignPropertyModalComponent', () => {
  let component: AssignPropertyModalComponent;
  let fixture: ComponentFixture<AssignPropertyModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignPropertyModalComponent, SharedTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignPropertyModalComponent);
    component = fixture.componentInstance;

    // Set required inputs using fixture.componentRef.setInput
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.componentRef.setInput('userProfile', { name: 'John Doe', email: 'john@example.com' });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onPropertyAssigned', () => {
    it('should emit propertyAssigned', () => {
      const mockProperty = { id: 'property-1', name: 'Apt 101' } as Property;
      spyOn(component.propertyAssigned, 'emit');

      component.onPropertyAssigned(mockProperty);

      expect(component.propertyAssigned.emit).toHaveBeenCalledWith(mockProperty);
    });
  });

  describe('onCancel', () => {
    it('should emit cancelled', () => {
      spyOn(component.cancelled, 'emit');
      component.onCancel();
      expect(component.cancelled.emit).toHaveBeenCalled();
    });
  });
});
