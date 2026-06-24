import { Component, inject, input, output, viewChild } from '@angular/core';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PropertyFormComponent } from '@shared/components/property-form/property-form.component';
import {
  PropertyFormValue,
  StructureOption,
} from '@shared/components/property-form/form.types';
import { Properties } from '@core/services/properties/properties';
import type { Property, Structure } from '@app-types/index';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { Toast } from '@core/services/toast/toast';
import { StructurePropertyValidationService } from '@core/services/structure-property-validation/structure-property-validation.service';

@Component({
  selector: 'app-property-form-modal',
  templateUrl: './property-form-modal.component.html',
  styleUrls: ['./property-form-modal.component.scss'],
  standalone: true,
  imports: [
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    TranslocoPipe,
    PropertyFormComponent,
  ],
})
export class PropertyFormModalComponent {
  // --- Dependencies ---
  private propertiesService = inject(Properties);
  private queryClient = inject(QueryClient);
  private translocoService = inject(TranslocoService);
  private toast = inject(Toast);
  private validationService = inject(StructurePropertyValidationService);

  // --- Inputs ---
  /** Property to edit (null for create mode) */
  property = input<Property | null>(null);
  /** Pre-selected structure ID (for create mode) */
  preSelectedStructureId = input<string | null>(null);
  /** Condominium ID for creating new properties */
  condominiumId = input.required<string>();
  /** Available structures for the dropdown */
  structures = input<Structure[]>([]);
  /** Existing properties for validation */
  existingProperties = input<Property[]>([]);
  /** Whether the modal is open */
  isOpen = input(false);

  // --- Outputs ---
  /** Emitted when the modal should close */
  isOpenChange = output<boolean>();

  // --- View Child ---
  propertyFormComponent = viewChild(PropertyFormComponent);

  // --- Computed ---
  isEditMode = () => this.property() !== null;

  /**
   * Maps the property to the form's initialData format.
   */
  getInitialData() {
    const p = this.property();
    if (!p) {
      // For create mode, pre-select the structure if provided
      return this.preSelectedStructureId()
        ? {
            name: '',
            share_percentage: 0,
            structure_id: this.preSelectedStructureId()!,
            owner_name: null,
            owner_email: null,
          }
        : null;
    }
    return {
      name: p.name,
      share_percentage: p.share_percentage,
      structure_id: p.structure_id,
      owner_name: p.owner_name ?? null,
      owner_email: p.owner_email ?? null,
    };
  }

  /**
   * Maps structures to StructureOption format for the dropdown.
   */
  getStructureOptions(): StructureOption[] {
    return this.structures().map((s) => ({
      id: s.id,
      name: s.name,
    }));
  }

  /**
   * Handles form submission - validates and calls the appropriate service method.
   */
  async handleSubmit() {
    const formComponent = this.propertyFormComponent();
    if (!formComponent) return;

    const formValue = formComponent.submit();
    if (!formValue) return;

    const existingProperties = this.existingProperties();
    const propertyToEdit = this.property();
    const structures = this.structures();

    // Find the target structure
    const targetStructure = structures.find(
      (s) => s.id === formValue.structure_id,
    );
    if (!targetStructure) {
      this.toast.present({
        message: this.translocoService.translate(
          'condominium.createStructure.structureNotFound',
          { name: formValue.structure_id },
        ),
        color: 'danger',
        dismissButton: true,
      });
      return;
    }

    // Get properties in the target structure for validation
    const propertiesInTargetStructure = existingProperties.filter(
      (p) => p.structure_id === formValue.structure_id,
    );
    const existingPropertyNames = propertiesInTargetStructure.map((p) => p.name);
    const editingId = propertyToEdit?.id;

    // Validate property name
    const nameValidation = this.validationService.validatePropertyName(
      formValue.name,
      existingPropertyNames,
      editingId,
    );

    if (!nameValidation.valid) {
      this.toast.present({
        message: this.translocoService.translate(
          nameValidation.errorKey!,
          { ...nameValidation.errorParams, structure: targetStructure.name },
        ),
        dismissButton: true,
      });
      return;
    }

    // Validate total percentage if needed
    const currentTotal = existingProperties.reduce(
      (sum, p) => sum + p.share_percentage,
      0,
    );
    const editingFee = propertyToEdit?.share_percentage;

    const percentageValidation = this.validationService.validateTotalPercentage(
      currentTotal,
      formValue.share_percentage,
      editingFee,
    );

    if (!percentageValidation.valid) {
      this.toast.present({
        message: this.translocoService.translate(
          percentageValidation.errorKey!,
        ),
        dismissButton: true,
      });
      return;
    }

    try {
      if (propertyToEdit) {
        // Update existing property
        await this.propertiesService.updateProperty(propertyToEdit.id, {
          name: formValue.name,
          share_percentage: formValue.share_percentage,
          structure_id: formValue.structure_id,
          owner_name: formValue.owner_name,
          owner_email: formValue.owner_email,
        });

        this.toast.present({
          message: this.translocoService.translate(
            'condominium.hub.toast.propertyUpdated',
          ),
          color: 'success',
        });
      } else {
        // Create new property
        await this.propertiesService.createProperties([
          {
            name: formValue.name,
            share_percentage: formValue.share_percentage,
            structure_id: formValue.structure_id,
            condominium_id: this.condominiumId(),
            owner_name: formValue.owner_name,
            owner_email: formValue.owner_email,
          },
        ]);

        this.toast.present({
          message: this.translocoService.translate(
            'condominium.hub.toast.propertyCreated',
          ),
          color: 'success',
        });
      }

      // Invalidate queries to refresh the list
      this.queryClient.invalidateQueries({ queryKey: ['properties'] });
      
      // Close the modal
      this.isOpenChange.emit(false);
    } catch (error) {
      console.error('Failed to save property:', error);
      this.toast.present({
        message: this.translocoService.translate(
          'condominium.hub.toast.saveError',
        ),
        color: 'danger',
        dismissButton: true,
      });
    }
  }
}
