import { AsyncPipe } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CreateCondominiumData } from '@core/services/condominium/condominium.types';
import { IonInput, IonButton, IonTextarea } from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CurrencySelectorComponent } from '@shared/components/currency-selector/currency-selector.component';
import { map } from 'rxjs/internal/operators/map';

interface CreateCondominiumFormControls {
  name: FormControl<string>;
  address: FormControl<string>;
  currency: FormControl<string>;
}

@Component({
  selector: 'app-create-condominium-form',
  templateUrl: './create-condominium-form.component.html',
  styleUrls: ['./create-condominium-form.component.scss'],
  imports: [
    ReactiveFormsModule,
    IonInput,
    IonButton,
    IonTextarea,
    TranslocoModule,
    AsyncPipe,
    CurrencySelectorComponent,
  ],
})
export class CreateCondominiumFormComponent {
  // --- Dependencies ---
  private translocoService = inject(TranslocoService);

  // --- Outputs ---
  submitCreateCondominiumForm = output<CreateCondominiumData>();

  // --- Form ---
  createCondominiumForm = new FormGroup<CreateCondominiumFormControls>({
    name: new FormControl('', {
      validators: [Validators.required, Validators.minLength(3)],
      nonNullable: true,
    }),
    address: new FormControl('', { nonNullable: true }),
    currency: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  //--- Properties ---
  nameError$ = this.createCondominiumForm.controls.name.statusChanges.pipe(
    map(() => {
      const nameControl = this.createCondominiumForm.controls.name;
      if (nameControl.hasError('required')) {
        return this.translocoService.translate('validation.required');
      }
      if (nameControl.hasError('minlength')) {
        return this.translocoService.translate('validation.minLength', {
          length: nameControl.getError('minlength').requiredLength,
        });
      }
      return null;
    }),
  );

  currencyError$ =
    this.createCondominiumForm.controls.currency.statusChanges.pipe(
      map(() => {
        const currencyControl = this.createCondominiumForm.controls.currency;
        if (currencyControl.hasError('required')) {
          return this.translocoService.translate('validation.required');
        }
        return null;
      }),
    );

  // --- Methods ---
  onSubmit() {
    if (this.createCondominiumForm.valid) {
      console.log(this.createCondominiumForm.value);
      // Handle form submission
    } else {
      Object.values(this.createCondominiumForm.controls).forEach((control) => {
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity();
      });
    }
    console.log(this.createCondominiumForm.controls.currency);
  }
}
