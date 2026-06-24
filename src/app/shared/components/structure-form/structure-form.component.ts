import { AsyncPipe } from '@angular/common';
import { Component, effect, inject, input, output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IonInput, IonTextarea, IonItem } from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs';
import {
  StructureFormInitialData,
  StructureFormValue,
} from '../property-form/form.types';

@Component({
  selector: 'app-structure-form',
  templateUrl: './structure-form.component.html',
  styleUrls: ['./structure-form.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonInput,
    IonTextarea,
    TranslocoPipe,
    AsyncPipe,
    IonItem,
  ],
})
export class StructureFormComponent {
  // --- Dependencies ---
  private translocoService = inject(TranslocoService);

  // --- Inputs ---
  /** Pre-fills the form when editing an existing structure */
  initialData = input<StructureFormInitialData | null>(null);

  // --- Outputs ---
  /** Emits form values when submitted with valid data */
  formSubmit = output<StructureFormValue>();

  // --- Form ---
  structureForm = new FormGroup({
    name: new FormControl('', {
      validators: [Validators.required, Validators.maxLength(50)],
      nonNullable: true,
    }),
    description: new FormControl<string | null>(null, {
      validators: [Validators.maxLength(120)],
    }),
  });

  // --- Error streams ---
  nameErrors$ = this.structureForm.controls.name.statusChanges.pipe(
    map(() => {
      const nameControl = this.structureForm.controls.name;
      if (nameControl.hasError('required')) {
        return this.translocoService.translate('validation.required');
      }
      if (nameControl.hasError('maxlength')) {
        return this.translocoService.translate('validation.maxLength', {
          length: nameControl.getError('maxlength').requiredLength,
        });
      }
      return null;
    }),
  );

  descriptionErrors$ = this.structureForm.controls.description.statusChanges.pipe(
    map(() => {
      const descriptionControl = this.structureForm.controls.description;
      if (descriptionControl.hasError('maxlength')) {
        return this.translocoService.translate('validation.maxLength', {
          length: descriptionControl.getError('maxlength').requiredLength,
        });
      }
      return null;
    }),
  );

  // --- Reactivity ---
  /** Watch for initialData changes and populate the form */
  private initDataEffect = effect(() => {
    const data = this.initialData();
    if (data) {
      this.structureForm.patchValue({
        name: data.name,
        description: data.description,
      });
    } else {
      this.resetForm();
    }
  });

  /**
   * Validates and submits the form.
   * Returns the form value if valid, null otherwise.
   */
  submit(): StructureFormValue | null {
    if (this.structureForm.valid) {
      const formValue: StructureFormValue = {
        name: this.structureForm.controls.name.value,
        description: this.structureForm.controls.description.value,
      };
      this.formSubmit.emit(formValue);
      this.resetForm();
      return formValue;
    } else {
      this.markAllAsTouched();
      return null;
    }
  }

  /**
   * Resets the form to its initial state.
   */
  private resetForm(): void {
    this.structureForm.reset({
      name: '',
      description: null,
    });
  }

  /**
   * Marks all form controls as touched to trigger validation display.
   */
  private markAllAsTouched(): void {
    Object.values(this.structureForm.controls).forEach((control) => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
  }
}
