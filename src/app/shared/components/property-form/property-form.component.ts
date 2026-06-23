import { AsyncPipe } from '@angular/common';
import { Component, effect, inject, input, output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonInput,
  IonSelect,
  IonSelectOption,
  IonItem,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs';
import {
  PropertyFormInitialData,
  PropertyFormValue,
  StructureOption,
} from './form.types';

@Component({
  selector: 'app-property-form',
  templateUrl: './property-form.component.html',
  styleUrls: ['./property-form.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    IonInput,
    IonSelect,
    IonSelectOption,
    AsyncPipe,
    IonItem,
  ],
})
export class PropertyFormComponent {
  // --- Dependencies ---
  private translocoService = inject(TranslocoService);

  // --- Inputs ---
  /** Pre-fills the form when editing an existing property */
  initialData = input<PropertyFormInitialData | null>(null);
  /** Structure options for the dropdown */
  structureOptions = input<StructureOption[]>([]);

  // --- Outputs ---
  /** Emits form values when submitted with valid data */
  formSubmit = output<PropertyFormValue>();

  // --- Form ---
  propertyForm = new FormGroup({
    name: new FormControl('', {
      validators: [Validators.required, Validators.maxLength(64)],
      nonNullable: true,
    }),
    share_percentage: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
    structure_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    owner_name: new FormControl<string | null>(null, {
      validators: [Validators.maxLength(50)],
    }),
    owner_email: new FormControl<string | null>(null, {
      validators: [Validators.email],
    }),
  });

  // --- Error streams ---
  nameErrors$ = this.propertyForm.controls.name.statusChanges.pipe(
    map(() => {
      const errors = this.propertyForm.controls.name.errors;
      if (!errors) return null;

      if (errors['required']) {
        return this.translocoService.translate('validation.required');
      }
      if (errors['maxlength']) {
        return this.translocoService.translate('validation.maxLength', {
          length: errors['maxlength']['requiredLength'],
        });
      }
      return null;
    }),
  );

  sharePercentageErrors$ = this.propertyForm.controls.share_percentage.statusChanges.pipe(
    map(() => {
      const errors = this.propertyForm.controls.share_percentage.errors;
      if (!errors) return null;

      if (errors['required']) {
        return this.translocoService.translate('validation.required');
      }
      if (errors['min']) {
        return this.translocoService.translate('validation.min', {
          value: errors['min']['min'],
        });
      }
      if (errors['max']) {
        return this.translocoService.translate('validation.max', {
          value: errors['max']['max'],
        });
      }
      return null;
    }),
  );

  structureErrors$ = this.propertyForm.controls.structure_id.statusChanges.pipe(
    map(() => {
      const errors = this.propertyForm.controls.structure_id.errors;
      if (!errors) return null;

      if (errors['required']) {
        return this.translocoService.translate('validation.required');
      }
      return null;
    }),
  );

  ownerNameErrors$ = this.propertyForm.controls.owner_name.statusChanges.pipe(
    map(() => {
      const errors = this.propertyForm.controls.owner_name.errors;
      if (!errors) return null;

      if (errors['maxlength']) {
        return this.translocoService.translate('validation.maxLength', {
          length: errors['maxlength']['requiredLength'],
        });
      }
      return null;
    }),
  );

  ownerEmailErrors$ = this.propertyForm.controls.owner_email.statusChanges.pipe(
    map(() => {
      const errors = this.propertyForm.controls.owner_email.errors;
      if (!errors) return null;

      if (errors['email']) {
        return this.translocoService.translate('validation.email');
      }
      return null;
    }),
  );

  // --- Reactivity ---
  /** Watch for initialData changes and populate the form */
  private initDataEffect = effect(() => {
    const data = this.initialData();
    if (data) {
      this.propertyForm.patchValue({
        name: data.name,
        share_percentage: data.share_percentage,
        structure_id: data.structure_id,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
      });
    } else {
      this.resetForm();
    }
  });

  // --- Methods ---

  /**
   * Validates and submits the form.
   * Returns the form value if valid, null otherwise.
   */
  submit(): PropertyFormValue | null {
    if (this.propertyForm.valid) {
      const formValue: PropertyFormValue = {
        name: this.propertyForm.controls.name.value,
        share_percentage: this.propertyForm.controls.share_percentage.value ?? 0,
        structure_id: this.propertyForm.controls.structure_id.value,
        owner_name: this.propertyForm.controls.owner_name.value,
        owner_email: this.propertyForm.controls.owner_email.value,
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
    this.propertyForm.reset({
      name: '',
      share_percentage: null,
      structure_id: '',
      owner_name: null,
      owner_email: null,
    });
  }

  /**
   * Marks all form controls as touched to trigger validation display.
   */
  private markAllAsTouched(): void {
    Object.values(this.propertyForm.controls).forEach((control) => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
  }
}
