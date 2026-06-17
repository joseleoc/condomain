import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { StructuresPropertiesAccordionComponent } from '../structures-properties-accordion/structures-properties-accordion.component';
import { CreatePropertyFormComponent } from '../create-property-form/create-property-form.component';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { CreatePropertyFormData } from '@features/create-condominium/create-condominium.types';
import { Subscription } from 'rxjs';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';

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
export class Step3Component implements OnInit, OnDestroy {
  // --- Dependencies ---
  private wizardService = inject(Wizard);

  // --- Properties ---
  private nextSubscription!: Subscription;

  structureSelected = signal<string | null>(null);

  // --- Lifecycle Methods ---
  ngOnInit() {
    this.nextSubscription = this.wizardService.nextStep$.subscribe(
      async (currentStep) => {
        this.wizardService.createStructuresAndProperties();
      },
    );
  }
  ngOnDestroy(): void {
    if (this.nextSubscription) {
      this.nextSubscription.unsubscribe();
    }
  }

  // --- Methods ---
  handleCreateProperty(values: CreatePropertyFormData) {
    this.wizardService.addPropertyToStructure(values.structure, values);
    this.structureSelected.set(values.structure);
  }
}
