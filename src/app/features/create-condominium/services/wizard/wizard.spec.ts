import { TestBed } from '@angular/core/testing';
import { Wizard } from './wizard';
import { Condominium } from '@core/services/condominium/condominium';
import { TranslocoService } from '@jsverse/transloco';
import { Toast } from '@core/services/toast/toast';
import { AlertController } from '@ionic/angular/standalone';
import { Structures } from '@core/services/structures/structures';
import { Properties } from '@core/services/properties/properties';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { MAX_STEPS } from '@features/create-condominium/create-condominium.constants';
import { LocalStructure, PropertyWithStructure } from '@features/create-condominium/create-condominium.types';

const STORAGE_KEY = 'condomain_wizard_state';
const fakeCondo = { id: 'condo-1', name: 'Test Condo', currency: 'USD', owner_id: 'user-1', active: true, created_at: '', updated_at: '', deleted_at: null };
const fakeStructure: LocalStructure = { name: 'Tower A', description: 'Main tower', properties: [] };
const fakeProperty = { number: 'Apt 101', fee: 50, structure: 'Tower A', ownerName: 'John', ownerEmail: 'john@test.com' };
const fakePropertyWithStructure: PropertyWithStructure = { ...fakeProperty, structureName: 'Tower A' };

function createMockAlert() {
  return {
    present: jasmine.createSpy('present').and.resolveTo(),
  } as any;
}

describe('Wizard', () => {
  let service: Wizard;
  let condominiumServiceSpy: jasmine.SpyObj<Condominium>;
  let translocoServiceSpy: jasmine.SpyObj<TranslocoService>;
  let toastSpy: jasmine.SpyObj<Toast>;
  let alertControllerSpy: jasmine.SpyObj<AlertController>;
  let structuresServiceSpy: jasmine.SpyObj<Structures>;
  let propertiesServiceSpy: jasmine.SpyObj<Properties>;
  let routerSpy: jasmine.SpyObj<Router>;
  let locationSpy: jasmine.SpyObj<Location>;

  function setupConfirmAlert() {
    let confirmHandler: Function | undefined;
    const alert = createMockAlert();
    alertControllerSpy.create.and.callFake(async (opts: any) => {
      const btn = opts.buttons?.find((b: any) => b.role === 'confirm');
      confirmHandler = btn?.handler;
      return alert;
    });
    return { alert, getHandler: () => confirmHandler };
  }

  beforeEach(() => {
    localStorage.clear();

    const condominiumSpy = jasmine.createSpyObj('Condominium', [
      'createCondominium',
      'updateCondominium',
    ]);
    const translocoSpy = jasmine.createSpyObj('TranslocoService', ['translate']);
    const toastSpyObj = jasmine.createSpyObj('Toast', ['present']);
    const alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    const structuresSpy = jasmine.createSpyObj('Structures', ['createStructures']);
    const propertiesSpy = jasmine.createSpyObj('Properties', ['createProperties']);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
    const locationSpyObj = jasmine.createSpyObj('Location', ['back']);

    translocoSpy.translate.and.callFake((key: string) => key);

    condominiumServiceSpy = condominiumSpy;
    translocoServiceSpy = translocoSpy;
    toastSpy = toastSpyObj;
    alertControllerSpy = alertCtrlSpy;
    structuresServiceSpy = structuresSpy;
    propertiesServiceSpy = propertiesSpy;
    routerSpy = routerSpyObj;
    locationSpy = locationSpyObj;

    TestBed.configureTestingModule({
      providers: [
        Wizard,
        { provide: Condominium, useValue: condominiumSpy },
        { provide: TranslocoService, useValue: translocoSpy },
        { provide: Toast, useValue: toastSpyObj },
        { provide: AlertController, useValue: alertCtrlSpy },
        { provide: Structures, useValue: structuresSpy },
        { provide: Properties, useValue: propertiesSpy },
        { provide: Router, useValue: routerSpyObj },
        { provide: Location, useValue: locationSpyObj },
      ],
    });

    service = TestBed.inject(Wizard);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start at step 1', () => {
      expect(service.step()).toBe(1);
    });

    it('should have no structures by default', () => {
      expect(service.structures$.getValue()).toEqual([]);
    });

    it('should have loading false', () => {
      expect(service.loading()).toBe(false);
    });

    it('should have createdCondominium null', () => {
      expect(service.createdCondominium()).toBeNull();
    });

    it('should have creationProcessSelected null', () => {
      expect(service.creationProcessSelected()).toBeNull();
    });

    it('should compute progressPercentage based on step', () => {
      expect(service.progressPercentage()).toBe(1 / MAX_STEPS);
      service.setStep(2);
      expect(service.progressPercentage()).toBe(2 / MAX_STEPS);
    });

    it('should have default button labels', () => {
      expect(service.buttonLabel()).toBe('common.next');
      expect(service.backLabel()).toBe('common.back');
    });
  });

  describe('hasSavedWizard', () => {
    it('should return false when localStorage is empty', () => {
      expect(service.hasSavedWizard()).toBe(false);
    });

    it('should return false when saved data has no condominium and no structures', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: 2,
        createdCondominium: null,
        structures: [],
        creationProcessSelected: null,
      }));
      const fresh = TestBed.inject(Wizard);
      expect(fresh.hasSavedWizard()).toBe(false);
    });

    it('should return true when saved data has a condominium', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: 2,
        createdCondominium: fakeCondo,
        structures: [],
        creationProcessSelected: null,
      }));
      const fresh = TestBed.inject(Wizard);
      expect(fresh.hasSavedWizard()).toBe(true);
    });

    it('should return true when saved data has structures', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: 2,
        createdCondominium: null,
        structures: [fakeStructure],
        creationProcessSelected: null,
      }));
      const fresh = TestBed.inject(Wizard);
      expect(fresh.hasSavedWizard()).toBe(true);
    });

    it('should return false when JSON is malformed', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');
      const fresh = TestBed.inject(Wizard);
      expect(fresh.hasSavedWizard()).toBe(false);
    });
  });

  describe('restoreFromStorage', () => {
    it('should restore step, condominium, structures, and creationProcessSelected', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: 3,
        createdCondominium: fakeCondo,
        structures: [fakeStructure],
        creationProcessSelected: 'simple',
      }));
      const fresh = TestBed.inject(Wizard);
      const result = fresh.restoreFromStorage();

      expect(result).toBe(true);
      expect(fresh.step()).toBe(3);
      expect(fresh.createdCondominium()).toEqual(fakeCondo as any);
      expect(fresh.structures$.getValue()).toEqual([fakeStructure]);
      expect(fresh.creationProcessSelected()).toBe('simple');
    });

    it('should return false and not restore when no saved data', () => {
      const result = service.restoreFromStorage();
      expect(result).toBe(false);
      expect(service.step()).toBe(1);
    });

    it('should nullify savedWizardData after restore', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: 2,
        createdCondominium: fakeCondo,
        structures: [],
        creationProcessSelected: null,
      }));
      const fresh = TestBed.inject(Wizard);
      expect(fresh.hasSavedWizard()).toBe(true);
      fresh.restoreFromStorage();
      expect(fresh.hasSavedWizard()).toBe(false);
    });
  });

  describe('clearStorage', () => {
    it('should remove localStorage key and clear hasSavedWizard', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: 2,
        createdCondominium: fakeCondo,
        structures: [],
        creationProcessSelected: null,
      }));
      const fresh = TestBed.inject(Wizard);
      expect(fresh.hasSavedWizard()).toBe(true);

      fresh.clearStorage();
      expect(fresh.hasSavedWizard()).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('setStep', () => {
    it('should set the step value', () => {
      service.setStep(2);
      expect(service.step()).toBe(2);
    });

    it('should persist step to localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: 2,
        createdCondominium: fakeCondo,
        structures: [fakeStructure],
        creationProcessSelected: null,
      }));
      const fresh = TestBed.inject(Wizard);
      fresh.restoreFromStorage();

      fresh.setStep(1);
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.step).toBe(1);
    });
  });

  describe('createCondominium', () => {
    const createData = { name: 'New Condo', owner_id: 'user-1', currency: 'USD' };

    it('should create condominium via service and update signals', async () => {
      condominiumServiceSpy.createCondominium.and.resolveTo(fakeCondo as any);

      await service.createCondominium(createData);

      expect(condominiumServiceSpy.createCondominium).toHaveBeenCalledWith(createData);
      expect(service.createdCondominium()).toEqual(fakeCondo as any);
      expect(service.loading()).toBe(false);
    });

    it('should set updatedFileAvatar when avatar is provided', async () => {
      condominiumServiceSpy.createCondominium.and.resolveTo(fakeCondo as any);
      const file = new File([''], 'avatar.png');

      await service.createCondominium({ ...createData, avatar: file });

      expect(service.updatedFileAvatar()).toBe(file);
    });

    it('should save to localStorage after creation', async () => {
      condominiumServiceSpy.createCondominium.and.resolveTo(fakeCondo as any);

      await service.createCondominium(createData);

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.createdCondominium).toEqual(fakeCondo as any);
    });

    it('should show toast and rethrow on error', async () => {
      const error = new Error('DB error');
      condominiumServiceSpy.createCondominium.and.rejectWith(error);

      await expectAsync(service.createCondominium(createData)).toBeRejectedWith(error);
      expect(toastSpy.present).toHaveBeenCalled();
      expect(service.loading()).toBe(false);
    });

    it('should not set signals when response is falsy', async () => {
      condominiumServiceSpy.createCondominium.and.resolveTo(undefined as any);

      await service.createCondominium(createData);

      expect(service.createdCondominium()).toBeNull();
    });
  });

  describe('updateCondominium', () => {
    const updateData = { name: 'Updated Condo', currency: 'EUR' };

    it('should update condominium via service and update signals', async () => {
      const updatedCondo = { ...fakeCondo, name: 'Updated Condo', currency: 'EUR' };
      condominiumServiceSpy.updateCondominium.and.resolveTo(updatedCondo as any);

      const result = await service.updateCondominium('condo-1', updateData);

      expect(condominiumServiceSpy.updateCondominium).toHaveBeenCalledWith('condo-1', updateData);
      expect(service.createdCondominium()).toEqual(updatedCondo as any);
      expect(result).toEqual(updatedCondo as any);
      expect(service.loading()).toBe(false);
    });

    it('should set updatedFileAvatar when avatar is provided', async () => {
      const updatedCondo = { ...fakeCondo, name: 'Updated Condo' };
      condominiumServiceSpy.updateCondominium.and.resolveTo(updatedCondo as any);
      const file = new File([''], 'new-avatar.png');

      await service.updateCondominium('condo-1', { ...updateData, avatar: file });

      expect(service.updatedFileAvatar()).toBe(file);
    });

    it('should persist update to localStorage', async () => {
      const updatedCondo = { ...fakeCondo, name: 'Updated Condo' };
      condominiumServiceSpy.updateCondominium.and.resolveTo(updatedCondo as any);

      await service.updateCondominium('condo-1', updateData);

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.createdCondominium.name).toBe('Updated Condo');
    });

    it('should show toast and rethrow on error', async () => {
      const error = new Error('Update failed');
      condominiumServiceSpy.updateCondominium.and.rejectWith(error);

      await expectAsync(service.updateCondominium('condo-1', updateData)).toBeRejectedWith(error);
      expect(toastSpy.present).toHaveBeenCalled();
      expect(service.loading()).toBe(false);
    });
  });

  describe('saveStructureLocally', () => {
    it('should add a new structure when no structure is selected', () => {
      const result = service.saveStructureLocally(fakeStructure);

      expect(result).toBe(true);
      expect(service.structures$.getValue()).toContain(fakeStructure);
    });

    it('should reject duplicate names when creating', () => {
      service.saveStructureLocally(fakeStructure);

      const result = service.saveStructureLocally(fakeStructure);

      expect(result).toBe(false);
      expect(toastSpy.present).toHaveBeenCalled();
      expect(service.structures$.getValue().length).toBe(1);
    });

    it('should edit an existing structure when one is selected', () => {
      service.saveStructureLocally(fakeStructure);
      service.selectedStructure.set(fakeStructure);
      const edited = { ...fakeStructure, description: 'Updated description' };

      const result = service.saveStructureLocally(edited);

      expect(result).toBe(true);
      expect(service.structures$.getValue()[0].description).toBe('Updated description');
    });

    it('should sort structures alphabetically', () => {
      service.saveStructureLocally({ name: 'Zeta', description: '', properties: [] });
      service.saveStructureLocally({ name: 'Alpha', description: '', properties: [] });

      const names = service.structures$.getValue().map((s) => s.name);
      expect(names).toEqual(['Alpha', 'Zeta']);
    });

    it('should persist to localStorage after save', () => {
      service.saveStructureLocally(fakeStructure);

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.structures.length).toBe(1);
    });

    it('should reject structure with empty name', () => {
      const result = service.saveStructureLocally({ name: '', description: '', properties: [] });

      expect(result).toBe(false);
      expect(service.structures$.getValue().length).toBe(0);
    });

    it('should reject structure with whitespace-only name', () => {
      const result = service.saveStructureLocally({ name: '   ', description: '', properties: [] });

      expect(result).toBe(false);
      expect(service.structures$.getValue().length).toBe(0);
    });
  });

  describe('addPropertyToStructure', () => {
    beforeEach(() => {
      service.saveStructureLocally(fakeStructure);
    });

    it('should add a property to an existing structure', () => {
      const result = service.addPropertyToStructure('Tower A', fakeProperty);

      expect(result).toBe(true);
      const structure = service.structures$.getValue()[0];
      expect(structure.properties).toContain(fakeProperty);
    });

    it('should reject when structure does not exist', () => {
      const result = service.addPropertyToStructure('NonExistent', fakeProperty);

      expect(result).toBe(false);
      expect(toastSpy.present).toHaveBeenCalled();
    });

    it('should reject duplicate property numbers within the same structure', () => {
      service.addPropertyToStructure('Tower A', fakeProperty);

      const result = service.addPropertyToStructure('Tower A', fakeProperty);

      expect(result).toBe(false);
      expect(toastSpy.present).toHaveBeenCalled();
    });

    it('should reject when total fee would exceed 100%', () => {
      service.addPropertyToStructure('Tower A', { ...fakeProperty, fee: 60 });
      const result = service.addPropertyToStructure('Tower A', { ...fakeProperty, number: 'Apt 102', fee: 50 });

      expect(result).toBe(false);
      expect(toastSpy.present).toHaveBeenCalled();
    });

    it('should persist to localStorage after adding', () => {
      service.addPropertyToStructure('Tower A', fakeProperty);

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.structures[0].properties.length).toBe(1);
    });

    it('should reject property with empty number', () => {
      const result = service.addPropertyToStructure('Tower A', { ...fakeProperty, number: '' });

      expect(result).toBe(false);
      expect(service.structures$.getValue()[0].properties.length).toBe(0);
    });

    it('should reject property with whitespace-only number', () => {
      const result = service.addPropertyToStructure('Tower A', { ...fakeProperty, number: '   ' });

      expect(result).toBe(false);
      expect(service.structures$.getValue()[0].properties.length).toBe(0);
    });
  });

  describe('editPropertyInStructure', () => {
    beforeEach(() => {
      service.saveStructureLocally(fakeStructure);
      service.addPropertyToStructure('Tower A', fakeProperty);
    });

    it('should throw error when no property is selected', () => {
      expect(() => service.editPropertyInStructure(fakePropertyWithStructure)).toThrowError('No property selected');
    });

    it('should update a property within the same structure', () => {
      service.selectedProperty.set(fakePropertyWithStructure);

      service.editPropertyInStructure({ ...fakePropertyWithStructure, fee: 75 });

      const structure = service.structures$.getValue()[0];
      expect(structure.properties[0].fee).toBe(75);
    });

    it('should allow editing a property without changing its number', () => {
      service.selectedProperty.set(fakePropertyWithStructure);

      service.editPropertyInStructure({ ...fakePropertyWithStructure, fee: 90, ownerName: 'Updated Owner' });

      const structure = service.structures$.getValue()[0];
      expect(structure.properties[0].number).toBe('Apt 101');
      expect(structure.properties[0].fee).toBe(90);
      expect(structure.properties[0].ownerName).toBe('Updated Owner');
      expect(structure.properties.length).toBe(1);
    });

    it('should allow editing a property and changing to a new unique number within the same structure', () => {
      service.selectedProperty.set(fakePropertyWithStructure);

      service.editPropertyInStructure({ ...fakePropertyWithStructure, number: 'Apt 202' });

      const structure = service.structures$.getValue()[0];
      expect(structure.properties[0].number).toBe('Apt 202');
      expect(structure.properties.length).toBe(1);
    });

    it('should reject editing a property to a number already taken by another property in the same structure', () => {
      service.addPropertyToStructure('Tower A', { ...fakeProperty, number: 'Apt 102', fee: 30 });
      service.selectedProperty.set(fakePropertyWithStructure);

      service.editPropertyInStructure({ ...fakePropertyWithStructure, number: 'Apt 102' });

      expect(toastSpy.present).toHaveBeenCalled();
      const towerA = service.structures$.getValue().find((s) => s.name === 'Tower A')!;
      expect(towerA.properties.length).toBe(2);
      expect(towerA.properties.find((p) => p.number === 'Apt 101')).toBeDefined();
      expect(towerA.properties.find((p) => p.number === 'Apt 102')).toBeDefined();
    });

    it('should reject editing when the duplicate property is at index 0', () => {
      const propA = { number: 'Apt 100', fee: 30, structure: 'Tower A', ownerName: null, ownerEmail: null };
      const propB = { ...fakeProperty, number: 'Apt 101' };
      service.addPropertyToStructure('Tower A', propA);
      service.addPropertyToStructure('Tower A', propB);
      service.selectedProperty.set({ ...fakePropertyWithStructure, number: 'Apt 101' });

      service.editPropertyInStructure({ ...fakePropertyWithStructure, number: 'Apt 100' });

      expect(toastSpy.present).toHaveBeenCalled();
      expect(service.structures$.getValue()[0].properties.length).toBe(2);
    });

    it('should move a property to a different structure', () => {
      service.saveStructureLocally({ name: 'Tower B', description: '', properties: [] });
      service.selectedProperty.set(fakePropertyWithStructure);
      const moved: PropertyWithStructure = { ...fakeProperty, structure: 'Tower B', structureName: 'Tower B' };

      service.editPropertyInStructure(moved);

      const towerB = service.structures$.getValue().find((s) => s.name === 'Tower B');
      expect(towerB?.properties.length).toBe(1);
      expect(towerB?.properties[0].number).toBe('Apt 101');
    });

    it('should reject when moving to a structure with an existing duplicate number', () => {
      service.saveStructureLocally({ name: 'Tower B', description: '', properties: [] });
      service.addPropertyToStructure('Tower B', { ...fakeProperty, structure: 'Tower B' });

      service.selectedProperty.set(fakePropertyWithStructure);
      const moved: PropertyWithStructure = { ...fakeProperty, structure: 'Tower B', structureName: 'Tower B' };

      service.editPropertyInStructure(moved);

      expect(toastSpy.present).toHaveBeenCalled();
    });

    it('should persist to localStorage after edit', () => {
      service.selectedProperty.set(fakePropertyWithStructure);

      service.editPropertyInStructure({ ...fakePropertyWithStructure, fee: 80 });

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.structures[0].properties[0].fee).toBe(80);
    });

    it('should reject edit with empty property number', () => {
      service.selectedProperty.set(fakePropertyWithStructure);
      const structuresBefore = service.structures$.getValue()[0].properties.length;

      service.editPropertyInStructure({ ...fakePropertyWithStructure, number: '' });

      expect(service.structures$.getValue()[0].properties.length).toBe(structuresBefore);
    });

    it('should reject edit with whitespace-only property number', () => {
      service.selectedProperty.set(fakePropertyWithStructure);
      const structuresBefore = service.structures$.getValue()[0].properties.length;

      service.editPropertyInStructure({ ...fakePropertyWithStructure, number: '   ' });

      expect(service.structures$.getValue()[0].properties.length).toBe(structuresBefore);
    });
  });

  describe('deletePropertyFromStructure', () => {
    beforeEach(() => {
      service.saveStructureLocally(fakeStructure);
      service.addPropertyToStructure('Tower A', fakeProperty);
    });

    it('should remove the property from the structure', () => {
      service.deletePropertyFromStructure('Tower A', 'Apt 101');

      const structure = service.structures$.getValue()[0];
      expect(structure.properties.length).toBe(0);
    });

    it('should do nothing when structure does not exist', () => {
      service.deletePropertyFromStructure('NonExistent', 'Apt 101');

      expect(service.structures$.getValue().length).toBe(1);
    });

    it('should do nothing when property does not exist', () => {
      service.deletePropertyFromStructure('Tower A', 'NonExistent');

      expect(service.structures$.getValue()[0].properties.length).toBe(1);
    });

    it('should persist to localStorage after delete', () => {
      service.deletePropertyFromStructure('Tower A', 'Apt 101');

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.structures[0].properties.length).toBe(0);
    });
  });

  describe('triggerNextStep and triggerBackStep', () => {
    it('should emit the current step via nextStep$', (done) => {
      service.nextStep$.subscribe((step) => {
        expect(step).toBe(1);
        done();
      });
      service.triggerNextStep();
    });

    it('should emit the current step via backStep$', (done) => {
      service.backStep$.subscribe((step) => {
        expect(step).toBe(1);
        done();
      });
      service.triggerBackStep();
    });

    it('should not emit nextStep when loading', () => {
      service.loading.set(true);
      let emitted = false;
      service.nextStep$.subscribe(() => (emitted = true));
      service.triggerNextStep();

      expect(emitted).toBe(false);
    });
  });

  describe('goBack', () => {
    it('should decrement step when step > 1', () => {
      service.setStep(3);
      service.goBack();
      expect(service.step()).toBe(2);
    });

    it('should call location.back when step is 1', () => {
      service.goBack();
      expect(locationSpy.back).toHaveBeenCalled();
    });

    it('should persist the decremented step to localStorage', () => {
      service.setStep(3);
      service.goBack();

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(saved.step).toBe(2);
    });
  });

  describe('createStructuresAndProperties', () => {
    it('should show toast when structures are empty', async () => {
      await service.createStructuresAndProperties();

      expect(toastSpy.present).toHaveBeenCalled();
    });

    it('should show alert when total fee is not 100%', async () => {
      service.saveStructureLocally({
        name: 'A',
        description: '',
        properties: [{ number: 'P1', fee: 50, structure: 'A', ownerName: null, ownerEmail: null }],
      });
      alertControllerSpy.create.and.resolveTo(createMockAlert());

      await service.createStructuresAndProperties();

      expect(alertControllerSpy.create).toHaveBeenCalled();
    });

    it('should not show alert when total fee is exactly 100%', async () => {
      service.saveStructureLocally({
        name: 'A',
        description: '',
        properties: [{ number: 'P1', fee: 100, structure: 'A', ownerName: null, ownerEmail: null }],
      });

      await service.createStructuresAndProperties();

      expect(alertControllerSpy.create).not.toHaveBeenCalled();
    });

    it('should upload structures and properties when confirm button is clicked', async () => {
      service.createdCondominium.set(fakeCondo as any);
      service.structures$.next([
        { name: 'A', description: '', properties: [{ number: 'P1', fee: 100, structure: 'A', ownerName: null, ownerEmail: null }] },
      ]);
      const createdStructure = {
        id: 'struct-1', name: 'A', description: '', condominium_id: 'condo-1',
        created_at: '', updated_at: '', deleted_at: null,
      };
      structuresServiceSpy.createStructures.and.resolveTo([createdStructure as any]);
      propertiesServiceSpy.createProperties.and.resolveTo([{
        id: 'prop-1', condominium_id: 'condo-1', structure_id: 'struct-1',
        name: 'P1', description: null, share_percentage: 100,
        owner_name: null, owner_email: null,
        created_at: '', updated_at: '', deleted_at: null,
      } as any]);

      const { getHandler } = setupConfirmAlert();
      await service.createStructuresAndProperties();
      const handler = getHandler();
      if (handler) handler();

      expect(structuresServiceSpy.createStructures).toHaveBeenCalled();
      expect(propertiesServiceSpy.createProperties).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should reject when upload fails', async () => {
      service.createdCondominium.set(fakeCondo as any);
      service.structures$.next([
        { name: 'A', description: '', properties: [{ number: 'P1', fee: 100, structure: 'A', ownerName: null, ownerEmail: null }] },
      ]);
      structuresServiceSpy.createStructures.and.rejectWith(new Error('fail'));

      const { getHandler } = setupConfirmAlert();
      await service.createStructuresAndProperties();
      const handler = getHandler();
      if (handler) {
        await expectAsync(handler()).toBeRejected();
      }
    });
  });

  describe('Observables', () => {
    it('should expose nextStep$ as observable', () => {
      expect(service.nextStep$).toBeDefined();
      const spy = jasmine.createSpy('nextSpy');
      service.nextStep$.subscribe(spy);
      service.triggerNextStep();
      expect(spy).toHaveBeenCalledWith(1);
    });

    it('should expose backStep$ as observable', () => {
      expect(service.backStep$).toBeDefined();
      const spy = jasmine.createSpy('backSpy');
      service.backStep$.subscribe(spy);
      service.triggerBackStep();
      expect(spy).toHaveBeenCalledWith(1);
    });
  });
});
