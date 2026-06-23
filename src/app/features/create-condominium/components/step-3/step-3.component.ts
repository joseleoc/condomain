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
import { PropertyFormComponent } from '@shared/components/property-form/property-form.component';
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
import {
  PropertyFormValue,
  StructureOption,
} from '@shared/components/property-form/form.types';

@Component({
  selector: 'app-step-3',
  templateUrl: './step-3.component.html',
  styleUrls: ['./step-3.component.scss'],
  imports: [
    StructuresPropertiesAccordionComponent,
    PropertyFormComponent,
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
  propertyFormComponent = viewChild(PropertyFormComponent);

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
    const formComponent = this.propertyFormComponent();
    if (formComponent) {
      const formData = formComponent.submit();
      if (formData) {
        // Map PropertyFormValue to CreatePropertyFormData for wizard
        const createPropertyData = {
          number: formData.name,
          fee: formData.share_percentage,
          structure: formData.structure_id, // In wizard, structure_id is the structure name
          ownerName: formData.owner_name,
          ownerEmail: formData.owner_email,
        };

        // If there's a selected property, it means we're editing an existing one
        if (this.wizardService.selectedProperty()) {
          this.wizardService.editPropertyInStructure({
            ...createPropertyData,
            structureName: formData.structure_id,
          });
          try {
            this.telemetry.track(TelemetryEvents.PROPERTY_EDITED, {
              structure_name: formData.structure_id,
              has_owner: formData.owner_name != null,
              fee: formData.share_percentage,
            });
          } catch {
            // Telemetry must never break wizard flow
          }
        } else {
          this.wizardService.addPropertyToStructure(
            formData.structure_id,
            createPropertyData,
          );
          try {
            this.telemetry.track(TelemetryEvents.PROPERTY_ADDED, {
              structure_name: formData.structure_id,
              has_owner: formData.owner_name != null,
              fee: formData.share_percentage,
            });
          } catch {
            // Telemetry must never break wizard flow
          }
        }

        const structure = this.wizardService.structures$
          .getValue()
          .find((s) => s.name === formData.structure_id);
        this.wizardService.selectedStructure.set(structure || null);
        this.closeModal();
      }
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

  /**
   * Maps the wizard's selectedProperty to the form's initialData format.
   */
  getPropertyInitialData() {
    const selected = this.wizardService.selectedProperty();
    if (!selected) return null;
    return {
      name: selected.number,
      share_percentage: selected.fee,
      structure_id: selected.structure, // In wizard, structure is the structure name
      owner_name: selected.ownerName,
      owner_email: selected.ownerEmail,
    };
  }

  /**
   * Maps wizard structures to StructureOption format for the dropdown.
   * In wizard context, structure name is used as the ID.
   */
  getStructureOptions(): StructureOption[] {
    const structures = this.wizardService.structures$.getValue();
    return structures.map((s) => ({
      id: s.name, // Use name as ID in wizard context
      name: s.name,
    }));
  }
}
