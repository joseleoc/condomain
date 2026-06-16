import { inject, Injectable } from '@angular/core';
import {
  CreatePropertyFormData,
  LocalStructure,
} from '@features/create-condominium/create-condominium.types';
import { BehaviorSubject } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { Toast } from '@core/services/toast/toast';

@Injectable({
  providedIn: 'root',
})
export class Structures {
  // --- Dependencies ---
  private toast = inject(Toast);
  private translocoService = inject(TranslocoService);
  // --- Properties ---
  structures$ = new BehaviorSubject<LocalStructure[]>([
    {
      name: 'Torre A',
      description: 'Descrição da Torre A',
      properties: [],
    },
    {
      name: 'Torre B',
      description: 'Descrição da Torre B',
      properties: [],
    },
  ]);

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
}
