import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { AssignPropertyFormComponent } from './assign-property-form.component';
import { Properties } from '@core/services/properties/properties';
import { Structures } from '@core/services/structures/structures';
import type { Property } from '@app-types/property';
import type { Structure } from '@app-types/structures';

describe('AssignPropertyFormComponent', () => {
  let component: AssignPropertyFormComponent;
  let fixture: ComponentFixture<AssignPropertyFormComponent>;
  let propertiesService: Properties;
  let structuresService: Structures;

  const mockProperties: Property[] = [
    {
      id: 'property-1',
      name: 'Apt 101',
      description: null,
      share_percentage: 25,
      structure_id: 'structure-1',
      condominium_id: 'condo-1',
      owner_name: null,
      owner_email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
    {
      id: 'property-2',
      name: 'Apt 102',
      description: 'Nice apartment',
      share_percentage: 25,
      structure_id: 'structure-1',
      condominium_id: 'condo-1',
      owner_name: 'John Doe',
      owner_email: 'john@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  const mockStructures: Structure[] = [
    {
      id: 'structure-1',
      name: 'Tower A',
      description: 'Main tower',
      condominium_id: 'condo-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignPropertyFormComponent, SharedTestingModule],
    }).compileComponents();

    propertiesService = TestBed.inject(Properties);
    structuresService = TestBed.inject(Structures);

    fixture = TestBed.createComponent(AssignPropertyFormComponent);
    component = fixture.componentInstance;

    // Set required inputs using fixture.componentRef.setInput
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.componentRef.setInput('userProfile', { name: 'John Doe', email: 'john@example.com' });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load properties and structures', () => {
      spyOn(propertiesService, 'fetchByCondominium').and.returnValue(
        Promise.resolve(mockProperties)
      );
      spyOn(structuresService, 'fetchByCondominium').and.returnValue(
        Promise.resolve(mockStructures)
      );

      component.ngOnInit();

      expect(propertiesService.fetchByCondominium).toHaveBeenCalledWith('condo-1');
      expect(structuresService.fetchByCondominium).toHaveBeenCalledWith('condo-1');
    });
  });

  describe('getStructureName', () => {
    it('should return structure name', () => {
      component.structures.set(mockStructures);
      const result = component.getStructureName('structure-1');
      expect(result).toBe('Tower A');
    });

    it('should return empty string if structure not found', () => {
      component.structures.set(mockStructures);
      const result = component.getStructureName('non-existent');
      expect(result).toBe('');
    });
  });

  describe('getPropertyDisplayName', () => {
    it('should return formatted property name', () => {
      component.structures.set(mockStructures);
      const result = component.getPropertyDisplayName(mockProperties[0]);
      expect(result).toBe('Tower A - Apt 101');
    });
  });

  describe('submit', () => {
    it('should emit propertyAssigned when form is valid', () => {
      component.properties.set(mockProperties);
      spyOn(component.propertyAssigned, 'emit');

      component.form.setValue({ propertyId: 'property-1' });
      component.submit();

      expect(component.propertyAssigned.emit).toHaveBeenCalledWith(mockProperties[0]);
    });

    it('should not emit when form is invalid', () => {
      spyOn(component.propertyAssigned, 'emit');

      component.form.setValue({ propertyId: null });
      component.submit();

      expect(component.propertyAssigned.emit).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should emit cancelled', () => {
      spyOn(component.cancelled, 'emit');
      component.cancel();
      expect(component.cancelled.emit).toHaveBeenCalled();
    });
  });
});
