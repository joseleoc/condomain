import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { StructuresPropertiesAccordionComponent } from '../structures-properties-accordion/structures-properties-accordion.component';
import { CreatePropertyFormComponent } from '../create-property-form/create-property-form.component';
import {
  IonHeader,
  IonModal,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { PropertiesListEmptyComponent } from '../properties-list-empty/properties-list-empty.component';
import { PropertyWithStructure } from '@features/create-condominium/create-condominium.types';

@Component({
  selector: 'app-step-3',
  templateUrl: './step-3.component.html',
  styleUrls: ['./step-3.component.scss'],
  imports: [
    StructuresPropertiesAccordionComponent,
    CreatePropertyFormComponent,
    TranslocoPipe,
    PropertiesListEmptyComponent,
    IonHeader,
    IonModal,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonIcon,
  ],
})
export class Step3Component implements OnInit, OnDestroy {
  // --- Dependencies ---
  private wizardService = inject(Wizard);

  // --- Components ---
  createPropertyFormComponent = viewChild(CreatePropertyFormComponent);

  // --- Properties ---
  private nextSubscription!: Subscription;
  private structuresSubscription!: Subscription;
  structureSelected = computed(
    () => this.wizardService.selectedStructure()?.name || null,
  );
  hasProperties = signal(false);
  isPropertiesModalOpen = signal(false);

  // --- Lifecycle Methods ---
  ngOnInit() {
    this.nextSubscription = this.wizardService.nextStep$.subscribe(
      async (currentStep) => {
        this.wizardService.createStructuresAndProperties();
      },
    );

    this.structuresSubscription = this.wizardService.structures$.subscribe(
      (structures) => {
        const hasProperties = structures.some((s) => s.properties.length > 0);
        this.hasProperties.set(hasProperties);
      },
    );
  }
  ngOnDestroy(): void {
    if (this.nextSubscription) {
      this.nextSubscription.unsubscribe();
    }
    if (this.structuresSubscription) {
      this.structuresSubscription.unsubscribe();
    }
  }

  // --- Methods ---
  handleCreateProperty() {
    const formData = this.createPropertyFormComponent()?.submit();
    if (formData) {
      // If there's a selected property, it means we're editing an existing one, so we call the edit method. Otherwise, we add a new property.
      if (this.wizardService.selectedProperty()) {
        this.wizardService.editPropertyInStructure({
          ...formData,
          structureName: formData.structure,
        });
      } else {
        this.wizardService.addPropertyToStructure(formData.structure, formData);
      }

      const structure = this.wizardService.structures$
        .getValue()
        .find((s) => s.name === formData.structure);
      this.wizardService.selectedStructure.set(structure || null);
      this.closeModal();
    }
  }

  closeModal() {
    this.isPropertiesModalOpen.set(false);
    this.wizardService.selectedProperty.set(null);
  }
  openModal() {
    this.isPropertiesModalOpen.set(true);
  }

  editProperty(property: PropertyWithStructure) {
    this.wizardService.selectedProperty.set(property);
    this.openModal();
  }
}
