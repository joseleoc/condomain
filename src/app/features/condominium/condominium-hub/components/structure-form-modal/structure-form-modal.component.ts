import { Component, inject, input, viewChild } from '@angular/core';
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
import { StructureFormComponent } from '@shared/components/structure-form/structure-form.component';
import { StructureFormValue } from '@shared/components/property-form/form.types';
import { Structures } from '@core/services/structures/structures';
import type { Structure } from '@app-types/structures';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { Toast } from '@core/services/toast/toast';
import { StructurePropertyValidationService } from '@core/services/structure-property-validation/structure-property-validation.service';

@Component({
  selector: 'app-structure-form-modal',
  templateUrl: './structure-form-modal.component.html',
  styleUrls: ['./structure-form-modal.component.scss'],
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
    StructureFormComponent,
  ],
})
export class StructureFormModalComponent {
  // --- Dependencies ---
  private structuresService = inject(Structures);
  private queryClient = inject(QueryClient);
  private translocoService = inject(TranslocoService);
  private toast = inject(Toast);
  private validationService = inject(StructurePropertyValidationService);

  // --- Inputs ---
  /** Structure to edit (null for create mode) */
  structure = input<Structure | null>(null);
  /** Condominium ID for creating new structures */
  condominiumId = input.required<string>();
  /** Existing structures for validation */
  existingStructures = input<Structure[]>([]);
  /** Whether the modal is open */
  isOpen = input(false);

  // --- View Child ---
  structureFormComponent = viewChild(StructureFormComponent);

  // --- Outputs (via modal dismiss) ---
  // The parent handles modal dismissal via isOpen input

  // --- Computed ---
  isEditMode = () => this.structure() !== null;

  /**
   * Maps the structure to the form's initialData format.
   */
  getInitialData() {
    const s = this.structure();
    if (!s) return null;
    return {
      name: s.name,
      description: s.description,
    };
  }

  /**
   * Handles form submission - validates and calls the appropriate service method.
   */
  async handleSubmit() {
    const formComponent = this.structureFormComponent();
    if (!formComponent) return;

    const formValue = formComponent.submit();
    if (!formValue) return;

    const existingStructures = this.existingStructures();
    const structureToEdit = this.structure();

    // Validate structure name
    const existingNames = existingStructures.map((s) => s.name);
    const editingId = structureToEdit?.id;
    const validationResult = this.validationService.validateStructureName(
      formValue.name,
      existingNames,
      editingId,
    );

    if (!validationResult.valid) {
      this.toast.present({
        message: this.translocoService.translate(
          validationResult.errorKey!,
          validationResult.errorParams,
        ),
        dismissButton: true,
      });
      return;
    }

    try {
      if (structureToEdit) {
        // Update existing structure
        await this.structuresService.updateStructure(structureToEdit.id, {
          name: formValue.name,
          description: formValue.description,
        });

        this.toast.present({
          message: this.translocoService.translate(
            'condominium.hub.toast.structureUpdated',
          ),
          color: 'success',
        });
      } else {
        // Create new structure
        await this.structuresService.createStructures([
          {
            name: formValue.name,
            description: formValue.description,
            condominium_id: this.condominiumId(),
          },
        ]);

        this.toast.present({
          message: this.translocoService.translate(
            'condominium.hub.toast.structureCreated',
          ),
          color: 'success',
        });
      }

      // Invalidate queries to refresh the list
      this.queryClient.invalidateQueries({ queryKey: ['structures'] });
    } catch (error) {
      console.error('Failed to save structure:', error);
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
