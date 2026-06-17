import { DecimalPipe } from '@angular/common';
import { Component, inject, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LocalStructure } from '@features/create-condominium/create-condominium.types';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import {
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonIcon,
  IonList,
  IonBadge,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-structures-properties-accordion',
  templateUrl: './structures-properties-accordion.component.html',
  styleUrls: ['./structures-properties-accordion.component.scss'],
  imports: [
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonIcon,
    IonList,
    TranslocoPipe,
    IonBadge,
    DecimalPipe,
  ],
})
export class StructuresPropertiesAccordionComponent {
  // --- Dependencies ---
  private wizardService = inject(Wizard);

  // --- Inputs ---
  structureSelected = input<string | null>(null);

  // --- Properties ---
  structures = toSignal(this.wizardService.structures$);
  totalPercentage = computed(
    () =>
      this.structures()?.reduce(
        (acc, structure) =>
          acc +
          structure.properties.reduce(
            (propAcc, property) => propAcc + property.fee,
            0,
          ),
        0,
      ) ?? 0,
  );

  calculateStructurePercentage(structure: LocalStructure): number {
    return (
      structure.properties.reduce((acc, property) => acc + property.fee, 0) ?? 0
    );
  }
}
