import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonIcon,
  IonList,
  IonBadge,
  IonButton,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Structure } from '@app-types/structures';
import type { Property } from '@app-types/property';

/**
 * A structure with its associated properties, used for display in the accordion.
 */
export interface StructureWithProperties {
  structure: Structure;
  properties: Property[];
  totalPercentage: number;
}

@Component({
  selector: 'app-hub-structures-accordion',
  templateUrl: './hub-structures-accordion.component.html',
  styleUrls: ['./hub-structures-accordion.component.scss'],
  standalone: true,
  imports: [
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonIcon,
    IonList,
    IonBadge,
    IonButton,
    TranslocoPipe,
    DecimalPipe,
  ],
})
export class HubStructuresAccordionComponent {
  // --- Inputs ---
  structures = input.required<Structure[]>();
  properties = input.required<Property[]>();
  isAdmin = input(false);

  // --- Outputs ---
  /** Emitted when admin clicks a structure header to edit */
  editStructure = output<Structure>();
  /** Emitted when admin clicks trash on a structure */
  deleteStructure = output<Structure>();
  /** Emitted when admin clicks + to add a new structure */
  addStructure = output<void>();
  /** Emitted when admin clicks a property to edit */
  editProperty = output<Property>();
  /** Emitted when admin clicks trash on a property */
  deleteProperty = output<Property>();
  /** Emitted when admin clicks + to add a property under a structure */
  addProperty = output<string>(); // structure_id

  // --- Computed: Group properties under their parent structure ---
  structuresWithProperties = computed<StructureWithProperties[]>(() => {
    const structures = this.structures();
    const properties = this.properties();

    return structures.map((structure) => {
      const structureProperties = properties
        .filter((p) => p.structure_id === structure.id)
        .sort((a, b) => a.name.localeCompare(b.name));

      const totalPercentage = structureProperties.reduce(
        (sum, p) => sum + p.share_percentage,
        0,
      );

      return {
        structure,
        properties: structureProperties,
        totalPercentage,
      };
    });
  });

  // --- Event Handlers ---

  onEditStructure(event: Event, structure: Structure) {
    event.stopPropagation();
    this.editStructure.emit(structure);
  }

  onDeleteStructure(event: Event, structure: Structure) {
    event.stopPropagation();
    this.deleteStructure.emit(structure);
  }

  onAddStructure() {
    this.addStructure.emit();
  }

  onEditProperty(event: Event, property: Property) {
    event.stopPropagation();
    this.editProperty.emit(property);
  }

  onDeleteProperty(event: Event, property: Property) {
    event.stopPropagation();
    this.deleteProperty.emit(property);
  }

  onAddProperty(event: Event, structureId: string) {
    event.stopPropagation();
    this.addProperty.emit(structureId);
  }
}
