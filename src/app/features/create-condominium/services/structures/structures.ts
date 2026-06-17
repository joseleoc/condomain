import { inject, Injectable } from '@angular/core';
import {
  CreatePropertyFormData,
  LocalStructure,
} from '@features/create-condominium/create-condominium.types';
import { BehaviorSubject } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { Toast } from '@core/services/toast/toast';
import { Supabase } from '@core/services/supabase/supabase';
import { Wizard } from '../wizard/wizard';
import { AlertController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class Structures {
  // --- Dependencies ---
  private toast = inject(Toast);
  private client = inject(Supabase).client;
  private translocoService = inject(TranslocoService);
  private wizardService = inject(Wizard);
  private alertController = inject(AlertController);
  // --- Properties ---
  structures$ = new BehaviorSubject<LocalStructure[]>([]);

  // --- Methods ---
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

  // --- Private Methods ---
  private async uploadStructuresToBackend(structures: LocalStructure[]) {
    const condominiumId = this.wizardService.createdCondominium()?.id;
    if (condominiumId == null) throw new Error('Condominium ID is null');
    try {
      const structuresToInsert = structures.map(({ name, description }) => ({
        name,
        description,
        condominium_id: condominiumId,
      }));

      const { data, error } = await this.client
        .from('structures')
        .insert(structuresToInsert)
        .select('id, name');

      if (error) throw error;
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
    const condominiumId = this.wizardService.createdCondominium()?.id;
    if (condominiumId == null) throw new Error('Condominium ID is null');
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
          condominium_id: condominiumId,
        }));
      });

      const { error, data } = await this.client
        .from('properties')
        .insert(propertiesToInsert);

      if (error) throw error;
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
