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
import { MassivePropertyCreationComponent } from '../massive-property-creation/massive-property-creation.component';
import { PropertyWithStructure } from '@features/create-condominium/create-condominium.types';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

@Component({
  selector: 'app-step-3',
  templateUrl: './step-3.component.html',
  styleUrls: ['./step-3.component.scss'],
  imports: [
    StructuresPropertiesAccordionComponent,
    CreatePropertyFormComponent,
    TranslocoPipe,
    PropertiesListEmptyComponent,
    MassivePropertyCreationComponent,
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
  private telemetry = inject(TelemetryService);

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
  creationProcessSelected = this.wizardService.creationProcessSelected;

  // --- Lifecycle Methods ---
  ngOnInit() {
    this.nextSubscription = this.wizardService.nextStep$.subscribe(async () => {
      console.log(
        'Step 3: Next step triggered, creating structures and properties...',
      );
      this.wizardService.createStructuresAndProperties();
    });

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
        try {
          this.telemetry.track(TelemetryEvents.PROPERTY_EDITED, {
            structure_name: formData.structure,
            has_owner: formData.ownerName != null,
            fee: formData.fee,
          });
        } catch {
          // Telemetry must never break wizard flow
        }
      } else {
        this.wizardService.addPropertyToStructure(formData.structure, formData);
        try {
          this.telemetry.track(TelemetryEvents.PROPERTY_ADDED, {
            structure_name: formData.structure,
            has_owner: formData.ownerName != null,
            fee: formData.fee,
          });
        } catch {
          // Telemetry must never break wizard flow
        }
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
