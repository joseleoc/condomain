import { Component, inject, output } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { map } from 'rxjs';
import { Structures } from '@features/create-condominium/services/structures/structures';
import { toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { CreatePropertyFormData } from '@features/create-condominium/create-condominium.types';

interface CreatePropertyFromControls {
  number: FormControl<string>;
  fee: FormControl<number>;
  structure: FormControl<string>;
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
  ],
})
export class CreatePropertyFormComponent {
  // --- Dependencies ---
  private translocoService = inject(TranslocoService);
  private structuresService = inject(Structures);

  // --- Form ---
  createPropertyForm = new FormGroup<CreatePropertyFromControls>({
    number: new FormControl('', {
      validators: [Validators.required, Validators.maxLength(64)],
      nonNullable: true,
    }),
    fee: new FormControl(0, {
      validators: [Validators.required, Validators.min(0)],
      nonNullable: true,
    }),
    structure: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  // --- Outputs ---
  submitCreatePropertyForm = output<CreatePropertyFormData>();
  // --- Properties ---
  structures = toSignal(this.structuresService.structures$);

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

  // --- Methods ---

  submit() {
    if (this.createPropertyForm.valid) {
      const formData: CreatePropertyFormData = {
        number: this.createPropertyForm.controls.number.value,
        fee: this.createPropertyForm.controls.fee.value,
        structure: this.createPropertyForm.controls.structure.value,
      };
      this.submitCreatePropertyForm.emit(formData);

      // Reset form after submit
      this.createPropertyForm.controls.number.reset('');
      this.createPropertyForm.controls.fee.reset(0);
    } else {
      Object.values(this.createPropertyForm.controls).forEach((control) => {
        control.markAsTouched();
        control.updateValueAndValidity();
      });
    }
  }
}
