import { computed, inject, Injectable, signal } from '@angular/core';
import { Condominium } from '@core/services/condominium/condominium';
import { TranslocoService } from '@jsverse/transloco';
import { Condominium as TCondominium } from '@app-types/condominium';
import {
  CreateCondominiumData,
  UpdateCondominiumData,
} from '@core/services/condominium/condominium.types';
import { MAX_STEPS } from '@features/create-condominium/create-condominium.constants';
import { Location } from '@angular/common';
import { BehaviorSubject, Subject } from 'rxjs';
import { Toast } from '@core/services/toast/toast';
import { AlertController } from '@ionic/angular/standalone';
import {
  CreateCondominiumProcessOptions,
  CreatePropertyFormData,
  LocalStructure,
  PropertyWithStructure,
} from '@features/create-condominium/create-condominium.types';
import { Structures } from '@core/services/structures/structures';
import { Properties } from '@core/services/properties/properties';
import { Router } from '@angular/router';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

interface WizardStorage {
  step: number;
  createdCondominium: TCondominium | null;
  structures: LocalStructure[];
  creationProcessSelected: CreateCondominiumProcessOptions | null;
}

const STORAGE_KEY = 'condomain_wizard_state';

@Injectable({
  providedIn: 'root',
})
export class Wizard {
  // --- Dependencies ---
  private location = inject(Location);
  private condominiumService = inject(Condominium);
  private toast = inject(Toast);
  private translocoService = inject(TranslocoService);
  private alertController = inject(AlertController);
  private structuresService = inject(Structures);
  private propertiesService = inject(Properties);
  private router = inject(Router);
  private telemetry = inject(TelemetryService);

  // --- Private Properties ---
  private nextStepSource = new Subject<number>();
  private backStepSource = new Subject<number>();
  private _step = signal(1);
  private savedWizardData: WizardStorage | null = null;
  private stepStartTime = Date.now();

  // --- Properties ---
  nextStep$ = this.nextStepSource.asObservable();
  backStep$ = this.backStepSource.asObservable();

  readonly step = this._step.asReadonly();
  loading = signal(false);
  createdCondominium = signal<TCondominium | null>(null);
  updatedFileAvatar = signal<File | null>(null);
  progressPercentage = computed(() => this.step() / MAX_STEPS);
  buttonLabel = signal('common.next');
  backLabel = signal('common.back');
  creationProcessSelected = signal<CreateCondominiumProcessOptions | null>(null);

  structures$ = new BehaviorSubject<LocalStructure[]>([]);

  selectedStructure = signal<LocalStructure | null>(null);
  selectedProperty = signal<PropertyWithStructure | null>(null);

  constructor() {
    this.savedWizardData = this.readFromStorage();
  }

  // --- Storage Methods ---

  hasSavedWizard(): boolean {
    return this.savedWizardData != null;
  }

  restoreFromStorage(): boolean {
    if (!this.savedWizardData) return false;
    this._step.set(this.savedWizardData.step);
    this.createdCondominium.set(this.savedWizardData.createdCondominium);
    this.structures$.next(this.savedWizardData.structures);
    this.creationProcessSelected.set(this.savedWizardData.creationProcessSelected);
    this.savedWizardData = null;
    try {
      this.telemetry.track(TelemetryEvents.WIZARD_RESTORED, {
        step: this._step(),
        creation_mode: this.creationProcessSelected(),
      });
    } catch {
      // Telemetry must never break wizard flow
    }
    return true;
  }

  clearStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.savedWizardData = null;
  }

  private readFromStorage(): WizardStorage | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const data: WizardStorage = JSON.parse(raw);
      if (data.createdCondominium == null && data.structures.length === 0) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  private saveToStorage(): void {
    try {
      const data: WizardStorage = {
        step: this._step(),
        createdCondominium: this.createdCondominium(),
        structures: this.structures$.getValue(),
        creationProcessSelected: this.creationProcessSelected(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Silently fail — storage might be full or unavailable
    }
  }

  // --- Methods ---

  setStep(value: number): void {
    const timeSpent = Date.now() - this.stepStartTime;
    const previousStep = this._step();
    this._step.set(value);
    this.saveToStorage();
    this.stepStartTime = Date.now();
    try {
      this.telemetry.track(TelemetryEvents.WIZARD_STEP_COMPLETED, {
        from_step: previousStep,
        to_step: value,
        time_spent_ms: timeSpent,
        creation_mode: this.creationProcessSelected(),
      });
    } catch {
      // Telemetry must never break wizard flow
    }
  }

  async createCondominium(data: CreateCondominiumData) {
    try {
      this.loading.set(true);
      const res = await this.condominiumService.createCondominium(data);
      if (res) {
        this.createdCondominium.set(res);
        this.updatedFileAvatar.set(data.avatar || null);
        this.saveToStorage();
      }
    } catch (error) {
      this.toast.present({
        message: this.translocoService.translate(
          'condominium.createForm.createError',
        ),
      });
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  async updateCondominium(id: string, data: UpdateCondominiumData) {
    try {
      this.loading.set(true);
      const res = await this.condominiumService.updateCondominium(id, data);
      if (res) {
        this.createdCondominium.set(res);
        if (data.avatar) {
          this.updatedFileAvatar.set(data.avatar);
        }
        this.saveToStorage();
      }
      return res;
    } catch (error) {
      this.toast.present({
        message: this.translocoService.translate(
          'condominium.createForm.createError',
        ),
      });
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Sends the local structures to the backend to create them in the database.
   */
  async createStructuresAndProperties() {
    try {
      const structures = this.structures$.getValue();
      if (structures.length === 0) {
        this.toast.present({
          message: this.translocoService.translate(
            'condominium.createStructure.noStructuresToCreate',
          ),
          color: 'warning',
        });
        return;
      }

      const totalPercentage = structures.reduce((acc, s) => {
        return acc + s.properties.reduce((sum, p) => sum + p.fee, 0);
      }, 0);

      if (totalPercentage != 100) {
        const alert = await this.alertController.create({
          header: this.translocoService.translate(
            'condominium.createStructure.invalidTotalFee',
          ),
          message: this.translocoService.translate(
            'condominium.createStructure.continueWithoutValidFeeMessage',
          ),
          buttons: [
            {
              text: this.translocoService.translate('common.cancel'),
              role: 'cancel',
            },
            {
              text: this.translocoService.translate('common.ok'),
              role: 'confirm',
              handler: () => {
                this.uploadStructuresAndProperties(structures);
              },
            },
          ],
        });
        await alert.present();
        return;
      }
    } catch (error) {
      this.toast.present({
        message: this.translocoService.translate(
          'condominium.createStructure.creationFailed',
        ),
      });
      throw error;
    }
  }

  saveStructureLocally(structure: LocalStructure): boolean {
    if (!structure.name || structure.name.trim().length === 0) {
      return false;
    }

    const currentStructures = this.structures$.getValue();
    const structuresToSave = [...currentStructures];
    const isEdit = this.selectedStructure() != null;

    if (!isEdit) {
      if (currentStructures.some((s) => s.name === structure.name)) {
        this.toast.present({
          message: this.translocoService.translate(
            'condominium.createStructure.structureAlreadyExists',
            { name: structure.name },
          ),
          dismissButton: true,
        });
        return false;
      }
    } else {
      const selected = this.selectedStructure();
      const foundStructureIndex = this.structures$
        .getValue()
        .findIndex((s) => s.name === selected?.name);
      if (foundStructureIndex != -1) {
        structuresToSave.splice(foundStructureIndex, 1);
      }
    }

    structuresToSave.push(structure);
    structuresToSave.sort((a, b) => a.name.localeCompare(b.name));
    this.structures$.next(structuresToSave);
    this.saveToStorage();

    try {
      this.telemetry.track(
        isEdit ? TelemetryEvents.STRUCTURE_EDITED : TelemetryEvents.STRUCTURE_ADDED,
        {
          mode: this.creationProcessSelected(),
          structures_count: structuresToSave.length,
        },
      );
    } catch {
      // Telemetry must never break wizard flow
    }

    return true;
  }

  addPropertyToStructure(
    structureName: string,
    property: CreatePropertyFormData,
  ) {
    if (!property.number || property.number.trim().length === 0) {
      return false;
    }

    const currentStructures = this.structures$.getValue();
    const structureIndex = currentStructures.findIndex(
      (s) => s.name === structureName,
    );
    if (structureIndex === -1) {
      this.toast.present({
        message: this.translocoService.translate(
          'condominium.createStructure.structureNotFound',
          { name: structureName },
        ),
        color: 'danger',
      });
      return false;
    }

    const structure = currentStructures[structureIndex];
    if (structure.properties.some((p) => p.number === property.number)) {
      this.toast.present({
        message: this.translocoService.translate(
          'condominium.createStructure.propertyAlreadyExists',
          { number: property.number, structure: structure.name },
        ),
        dismissButton: true,
        duration: 5000,
      });
      return false;
    }

    const totalPercentage =
      currentStructures.reduce((acc, s) => {
        return acc + s.properties.reduce((sum, p) => sum + p.fee, 0);
      }, 0) + property.fee;
    const isMoreThan100Percentage = totalPercentage > 100;

    if (isMoreThan100Percentage) {
      console.info('Total fee exceeds 100%:', totalPercentage);
      this.toast.present({
        message: this.translocoService.translate(
          'condominium.createStructure.totalFeeExceeds100',
        ),
        dismissButton: true,
        duration: 5000,
      });
      return false;
    }

    const updatedStructure = {
      ...structure,
      properties: [...structure.properties, property].sort((a, b) =>
        a.number.localeCompare(b.number),
      ),
    };

    const updatedStructures = [...currentStructures];
    updatedStructures[structureIndex] = updatedStructure;

    this.structures$.next(updatedStructures);
    this.saveToStorage();

    try {
      this.telemetry.track(TelemetryEvents.PROPERTY_ADDED, {
        structure_name: structureName,
        has_owner: property.ownerName != null,
        fee: property.fee,
      });
    } catch {
      // Telemetry must never break wizard flow
    }

    return true;
  }

  editPropertyInStructure(property: PropertyWithStructure) {
    if (this.selectedProperty() == null) {
      throw new Error('No property selected');
    }

    if (!property.number || property.number.trim().length === 0) {
      return;
    }

    const currentStructures = new Map(
      this.structures$.getValue().map((s) => [s.name, s]),
    );

    const currentStructure = currentStructures.get(
      this.selectedProperty()!.structureName,
    );
    const targetStructure = currentStructures.get(property.structure);

    const targetIndex = targetStructure?.properties.findIndex(
      (p) => p.number === property.number,
    );

    if (targetIndex != -1 && currentStructure !== targetStructure) {
      this.toast.present({
        message: this.translocoService.translate(
          'condominium.createStructure.propertyAlreadyExists',
          { number: property.number, structure: targetStructure?.name },
        ),
        dismissButton: true,
        duration: 5000,
      });
      return;
    }

    if (
      targetIndex != null &&
      targetIndex != -1 &&
      targetStructure?.properties[targetIndex].number !==
        this.selectedProperty()!.number &&
      currentStructure === targetStructure
    ) {
      this.toast.present({
        message: this.translocoService.translate(
          'condominium.createStructure.propertyAlreadyExists',
          { number: property.number, structure: targetStructure?.name },
        ),
        dismissButton: true,
        duration: 5000,
      });
      return;
    }

    const currentIndex = currentStructure?.properties.findIndex(
      (p) => p.number === this.selectedProperty()!.number,
    );
    if (currentIndex != null) {
      currentStructure?.properties.splice(currentIndex, 1);
    }

    targetStructure?.properties.push(property);
    targetStructure?.properties.sort((a, b) =>
      a.number.localeCompare(b.number),
    );

    this.structures$.next(Array.from(currentStructures.values()));
    this.selectedStructure.set(targetStructure || null);
    this.selectedProperty.set(null);
    this.saveToStorage();

    try {
      this.telemetry.track(TelemetryEvents.PROPERTY_EDITED, {
        structure_name: property.structure,
        has_owner: property.ownerName != null,
        fee: property.fee,
      });
    } catch {
      // Telemetry must never break wizard flow
    }
  }

  triggerNextStep() {
    if (!this.loading()) {
      this.nextStepSource.next(this._step());
    }
  }

  triggerBackStep() {
    if (!this.loading()) {
      this.backStepSource.next(this._step());
    }
  }

  goBack() {
    if (this._step() > 1) {
      this._step.update((value) => value - 1);
      this.saveToStorage();
      return;
    }
    this.location.back();
  }

  deletePropertyFromStructure(structureName: string, propertyNumber: string) {
    const currentStructures = new Map(
      this.structures$.getValue().map((s) => [s.name, s]),
    );
    const structure = currentStructures.get(structureName);
    if (!structure) return;

    const propertyIndex = structure.properties.findIndex(
      (p) => p.number === propertyNumber,
    );
    if (propertyIndex === -1) return;

    structure.properties.splice(propertyIndex, 1);
    this.structures$.next(Array.from(currentStructures.values()));
    this.saveToStorage();

    try {
      this.telemetry.track(TelemetryEvents.PROPERTY_DELETED, {
        structure_name: structureName,
      });
    } catch {
      // Telemetry must never break wizard flow
    }
  }

  // --- Private Methods ---
  private async uploadStructuresToBackend(structures: LocalStructure[]) {
    const condominium_id = this.createdCondominium()?.id;
    if (condominium_id == null) throw new Error('Condominium ID is null');
    try {
      const structuresToInsert = structures.map(({ name, description }) => ({
        name,
        description,
        condominium_id,
      }));

      const data =
        await this.structuresService.createStructures(structuresToInsert);

      if (!data) return [];

      const idMap = new Map<string, string>(data.map((s) => [s.name, s.id]));

      const updatedStructures = structures
        .map((structure) => {
          const structureId = idMap.get(structure.name);
          return structureId ? { ...structure, id: structureId } : undefined;
        })
        .filter((s) => s != null)
        .sort((a, b) => a.name.localeCompare(b.name));

      this.structures$.next(updatedStructures);
      return updatedStructures;
    } catch (error) {
      throw error;
    }
  }

  private async uploadPropertiesToBackend(structures: LocalStructure[]) {
    const condominium_id = this.createdCondominium()?.id;
    if (condominium_id == null) throw new Error('Condominium ID is null');
    try {
      const propertiesToInsert = structures.flatMap((structure) => {
        if (!structure.id) {
          console.warn(
            `Skipping properties for structure "${structure.name}" because it has no ID.`,
          );
          return [];
        }
        return structure.properties.map((property) => ({
          name: property.number,
          share_percentage: property.fee,
          structure_id: structure.id!,
          condominium_id,
          owner_name: property.ownerName,
          owner_email: property.ownerEmail,
        }));
      });

      const data =
        await this.propertiesService.createProperties(propertiesToInsert);

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  private async uploadStructuresAndProperties(structures: LocalStructure[]) {
    try {
      const updatedStructures =
        await this.uploadStructuresToBackend(structures);

      await this.uploadPropertiesToBackend(updatedStructures);

      const totalProperties = updatedStructures.reduce(
        (acc, s) => acc + s.properties.length,
        0,
      );

      try {
        this.telemetry.track(TelemetryEvents.WIZARD_CREATION_COMPLETED, {
          structures_count: updatedStructures.length,
          properties_count: totalProperties,
          creation_mode: this.creationProcessSelected(),
        });
      } catch {
        // Telemetry must never break wizard flow
      }

      this.structures$.next([]);
      this.clearStorage();
      this.toast.present({
        message: this.translocoService.translate('condominium.creationSuccess'),
        color: 'success',
      });
      this.router.navigate(['/home']);
    } catch (error) {
      throw error;
    }
  }
}
