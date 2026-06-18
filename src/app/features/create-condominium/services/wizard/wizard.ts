import { computed, inject, Injectable, signal } from '@angular/core';
import { Condominium } from '@core/services/condominium/condominium';
import { TranslocoService } from '@jsverse/transloco';
import { Condominium as TCondominium } from '@app-types/condominium';
import { CreateCondominiumData } from '@core/services/condominium/condominium.types';
import { MAX_STEPS } from '@features/create-condominium/create-condominium.constants';
import { Location } from '@angular/common';
import { BehaviorSubject, Subject } from 'rxjs';
import { Toast } from '@core/services/toast/toast';
import { AlertController } from '@ionic/angular/standalone';
import {
  CreatePropertyFormData,
  LocalStructure,
  PropertyWithStructure,
} from '@features/create-condominium/create-condominium.types';
import { Structures } from '@core/services/structures/structures';
import { Properties } from '@core/services/properties/properties';
import { Router } from '@angular/router';

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

  // --- Private Properties ---
  private nextStepSource = new Subject<number>();
  private backStepSource = new Subject<number>();

  // --- Properties ---
  nextStep$ = this.nextStepSource.asObservable();
  backStep$ = this.backStepSource.asObservable();

  step = signal(3);
  loading = signal(false);
  createdCondominium = signal<TCondominium | null>(null);
  updatedFileAvatar = signal<File | null>(null);
  progressPercentage = computed(() => this.step() / MAX_STEPS);
  buttonLabel = signal('common.next');
  backLabel = signal('common.back');

  structures$ = new BehaviorSubject<LocalStructure[]>([
    {
      name: 'Estructura 1',
      description: 'Descripción de la estructura 1',
      properties: [
        {
          number: 'Propiedad 1',
          fee: 1,
          structure: 'Estructura 1',
          ownerName: 'Juan Pérez',
          ownerEmail: 'juan.perez@example.com',
        },
        {
          number: 'Propiedad 2',
          fee: 2,
          structure: 'Estructura 1',
          ownerName: 'Juan Pérez',
          ownerEmail: 'juan.perez@example.com',
        },
        {
          number: 'Propiedad 3',
          fee: 3,
          structure: 'Estructura 1',
          ownerName: 'Juan Pérez',
          ownerEmail: 'juan.perez@example.com',
        },
      ],
    },
    {
      name: 'Estructura 2',
      description: 'Descripción de la estructura 2',
      properties: [],
    },
    {
      name: 'Estructura 3',
      description: 'Descripción de la estructura 3',
      properties: [],
    },
  ]);

  selectedStructure = signal<LocalStructure | null>(null);
  selectedProperty = signal<PropertyWithStructure | null>(null);

  // --- Methods ---

  async createCondominium(data: CreateCondominiumData) {
    try {
      this.loading.set(true);
      const res = await this.condominiumService.createCondominium(data);
      if (res) {
        this.createdCondominium.set(res);
        this.updatedFileAvatar.set(data.avatar || null);
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

  /**
   * Sends the local structures to the backend to create them in the database. After successful creation, it should clear the local structures and show a success message. If there's an error during creation, it should show an error message.
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
    const currentStructures = this.structures$.getValue();
    const structuresToSave = [...currentStructures];

    // If there is not a selected structure, we are creating a new one, so we need to check if the name already exists
    if (this.selectedStructure() == null) {
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
    }
    // If there is a selected structure, we are editing/updating it
    else {
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
    return true;
  }

  addPropertyToStructure(
    structureName: string,
    property: CreatePropertyFormData,
  ) {
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
    return true;
  }

  editPropertyInStructure(property: PropertyWithStructure) {
    if (this.selectedProperty() == null) {
      throw new Error('No property selected');
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

    // In case we want to move a property to another structure and there is already a property with the same number in the target structure, we show an error message and do not allow the move
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
      targetIndex &&
      targetIndex != -1 &&
      // If is different that itself
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
  }

  /** Trigger the next step in the wizard, the event occurs when the user clicks on the footer button */
  triggerNextStep() {
    if (!this.loading()) {
      this.nextStepSource.next(this.step());
    }
  }

  /** Trigger the back step in the wizard, the event occurs when the user clicks on the footer button */
  triggerBackStep() {
    if (!this.loading()) {
      this.backStepSource.next(this.step());
    }
  }

  goBack() {
    if (this.step() > 1) {
      this.step.update((value) => value - 1);
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

      this.structures$.next([]);
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
