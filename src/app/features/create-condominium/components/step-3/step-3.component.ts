import { Component, inject, signal } from '@angular/core';
import { StructuresPropertiesAccordionComponent } from '../structures-properties-accordion/structures-properties-accordion.component';
import { CreatePropertyFormComponent } from '../create-property-form/create-property-form.component';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { Structures } from '@features/create-condominium/services/structures/structures';
import {
  CreatePropertyFormData,
  LocalStructure,
} from '@features/create-condominium/create-condominium.types';

@Component({
  selector: 'app-step-3',
  templateUrl: './step-3.component.html',
  styleUrls: ['./step-3.component.scss'],
  imports: [
    StructuresPropertiesAccordionComponent,
    CreatePropertyFormComponent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    TranslocoPipe,
  ],
})
export class Step3Component {
  private structuresService = inject(Structures);

  structureSelected = signal<string | null>(null);

  // --- Methods ---
  handleCreateProperty(values: CreatePropertyFormData) {
    this.structuresService.addPropertyToStructure(values.structure, values);
    this.structureSelected.set(values.structure);
  }
}
