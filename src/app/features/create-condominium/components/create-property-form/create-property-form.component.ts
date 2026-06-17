import { Component, inject, input, output } from '@angular/core';
import {
  ReactiveFormsModule,
  FormGroup,
  Validators,
  FormControl,
} from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonItem,
} from '@ionic/angular/standalone';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { CreatePropertyFormData } from '@features/create-condominium/create-condominium.types';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';

interface CreatePropertyFromControls {
  number: FormControl<string>;
  fee: FormControl<number | null>;
  structure: FormControl<string>;
  ownerName: FormControl<string | null>;
  ownerEmail: FormControl<string | null>;
}

@Component({
  selector: 'app-create-property-form',
  templateUrl: './create-property-form.component.html',
  styleUrls: ['./create-property-form.component.scss'],
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    AsyncPipe,
    IonItem,
  ],
})
export class CreatePropertyFormComponent {
  // --- Dependencies ---
  private translocoService = inject(TranslocoService);
  private wizardService = inject(Wizard);

  // --- Inputs ---
  showButton = input(true);

  // --- Form ---
  createPropertyForm = new FormGroup<CreatePropertyFromControls>({
    number: new FormControl('', {
      validators: [Validators.required, Validators.maxLength(64)],
      nonNullable: true,
    }),
    fee: new FormControl(null, {
      validators: [Validators.required, Validators.min(0)],
      nonNullable: true,
    }),
    structure: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    ownerName: new FormControl(null, {
      validators: [Validators.maxLength(50)],
    }),
    ownerEmail: new FormControl(null, {
      validators: [Validators.email],
    }),
  });

  // --- Outputs ---
  submitCreatePropertyForm = output<CreatePropertyFormData>();
  // --- Properties ---
  structures = toSignal(this.wizardService.structures$);

  numberErrors$ = this.createPropertyForm.controls.number.statusChanges.pipe(
    map(() => {
      const errors = this.createPropertyForm.controls.number.errors;
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

  feeErrors$ = this.createPropertyForm.controls.fee.statusChanges.pipe(
    map(() => {
      const errors = this.createPropertyForm.controls.fee.errors;
      if (!errors) return null;

      if (errors['required']) {
        return this.translocoService.translate('validation.required');
      }
      if (errors['min']) {
        return this.translocoService.translate('validation.min', {
          value: errors['min']['min'],
        });
      }
      return null;
    }),
  );

  structureErrors$ =
    this.createPropertyForm.controls.structure.statusChanges.pipe(
      map(() => {
        const errors = this.createPropertyForm.controls.structure.errors;
        if (!errors) return null;

        if (errors['required']) {
          return this.translocoService.translate('validation.required');
        }
        return null;
      }),
    );

  ownerNameErrors$ =
    this.createPropertyForm.controls.ownerName.statusChanges.pipe(
      map(() => {
        const errors = this.createPropertyForm.controls.ownerName.errors;
        if (!errors) return null;

        if (errors['maxlength']) {
          return this.translocoService.translate('validation.maxLength', {
            length: errors['maxlength']['requiredLength'],
          });
        }
        return null;
      }),
    );

  ownerEmailErrors$ =
    this.createPropertyForm.controls.ownerEmail.statusChanges.pipe(
      map(() => {
        const errors = this.createPropertyForm.controls.ownerEmail.errors;
        if (!errors) return null;

        if (errors['email']) {
          return this.translocoService.translate('validation.email');
        }
        return null;
      }),
    );

  // --- Methods ---

  submit() {
    if (this.createPropertyForm.valid) {
      const formData: CreatePropertyFormData = {
        number: this.createPropertyForm.controls.number.value,
        fee: this.createPropertyForm.controls.fee.value || 0,
        structure: this.createPropertyForm.controls.structure.value,
        ownerName: this.createPropertyForm.controls.ownerName.value,
        ownerEmail: this.createPropertyForm.controls.ownerEmail.value,
      };
      this.submitCreatePropertyForm.emit(formData);

      // Reset form after submit
      this.createPropertyForm.reset();
      return formData;
    } else {
      Object.values(this.createPropertyForm.controls).forEach((control) => {
        control.markAsTouched();
        control.updateValueAndValidity();
      });
    }
    return null;
  }
}
