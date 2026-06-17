import {
  Component,
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
  structureSelected = signal<string | null>(null);
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
      this.wizardService.addPropertyToStructure(formData.structure, formData);
      this.structureSelected.set(formData.structure);
      this.closeModal();
    }
  }

  closeModal() {
    this.isPropertiesModalOpen.set(false);
  }
  openModal() {
    this.isPropertiesModalOpen.set(true);
  }
}
