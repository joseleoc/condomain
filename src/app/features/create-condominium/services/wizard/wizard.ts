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
} from '@features/create-condominium/create-condominium.types';
import { Structures } from '@core/services/structures/structures';
import { Properties } from '@core/services/properties/properties';

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

  // --- Private Properties ---
  private nextStepSource = new Subject<number>();
  private backStepSource = new Subject<number>();

  // --- Properties ---
  nextStep$ = this.nextStepSource.asObservable();
  backStep$ = this.backStepSource.asObservable();

  step = signal(1);
  loading = signal(false);
  createdCondominium = signal<TCondominium | null>(null);
  updatedFileAvatar = signal<File | null>(null);
  progressPercentage = computed(() => this.step() / MAX_STEPS);
  buttonLabel = signal('common.next');
  backLabel = signal('common.back');

  structures$ = new BehaviorSubject<LocalStructure[]>([]);

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

    const structuresToSave = [...currentStructures, structure].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

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
      console.log('Structures created successfully:', updatedStructures);

      await this.uploadPropertiesToBackend(updatedStructures);
      console.log('Properties created successfully');

      this.structures$.next([]);
      this.toast.present({
        message: this.translocoService.translate(
          'condominium.createStructure.creationSuccess',
        ),
        color: 'success',
      });
    } catch (error) {
      throw error;
    }
  }
}
