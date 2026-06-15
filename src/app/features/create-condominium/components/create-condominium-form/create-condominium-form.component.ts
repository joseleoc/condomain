import { AsyncPipe } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CreateCondominiumData } from '@core/services/condominium/condominium.types';
import { Profile } from '@core/services/profile/profile';
import { IonInput, IonButton, IonTextarea } from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AvatarUploaderComponent } from '@shared/components/avatar-uploader/avatar-uploader.component';
import { CurrencySelectorComponent } from '@shared/components/currency-selector/currency-selector.component';
import { map } from 'rxjs/internal/operators/map';

interface CreateCondominiumFormControls {
  name: FormControl<string>;
  address?: FormControl<string | null>;
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
    AvatarUploaderComponent,
  ],
})
export class CreateCondominiumFormComponent {
  // --- Dependencies ---
  private translocoService = inject(TranslocoService);
  private profileService = inject(Profile);

  // --- Outputs ---
  submitCreateCondominiumForm = output<CreateCondominiumData>();

  // --- Form ---
  createCondominiumForm = new FormGroup<CreateCondominiumFormControls>({
    name: new FormControl('', {
      validators: [Validators.required, Validators.minLength(3)],
      nonNullable: true,
    }),
    address: new FormControl(''),
    currency: new FormControl('USD', {
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
    const profileId = this.profileService.profile$.getValue()?.id;
    if (profileId == undefined) {
      throw new Error('Profile ID is required to create a condominium');
    }

    if (this.createCondominiumForm.valid) {
      this.submitCreateCondominiumForm.emit({
        ...this.createCondominiumForm.getRawValue(),
        owner_id: profileId,
      });
    } else {
      Object.values(this.createCondominiumForm.controls).forEach((control) => {
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity();
      });
    }
  }
}
