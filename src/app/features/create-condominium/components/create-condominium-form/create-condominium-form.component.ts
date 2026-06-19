import { AsyncPipe } from '@angular/common';
import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CreateCondominiumData } from '@core/services/condominium/condominium.types';
import { Profile } from '@core/services/profile/profile';
import {
  IonInput,
  IonButton,
  IonTextarea,
  IonSpinner,
  IonItem,
} from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AvatarUploaderComponent } from '@shared/components/avatar-uploader/avatar-uploader.component';
import { CurrencySelectorComponent } from '@shared/components/currency-selector/currency-selector.component';
import { map } from 'rxjs/internal/operators/map';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';

interface CreateCondominiumFormControls {
  name: FormControl<string>;
  address?: FormControl<string | null>;
  currency: FormControl<string>;
  avatar: FormControl<File | null | undefined>;
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
    IonSpinner,
    IonItem,
  ],
})
export class CreateCondominiumFormComponent {
  // --- Dependencies ---
  private translocoService = inject(TranslocoService);
  private profileService = inject(Profile);
  private wizardService = inject(Wizard);

  // -- Inputs ---
  defaultValues = this.wizardService.createdCondominium;

  loading = input<boolean>(false);
  showSubmitButton = input<boolean>(true);

  // --- Outputs ---
  submitCreateCondominiumForm = output<CreateCondominiumData>();

  // --- Form ---
  createCondominiumForm = new FormGroup<CreateCondominiumFormControls>({
    name: new FormControl(this.defaultValues()?.name || '', {
      validators: [Validators.required, Validators.minLength(3)],
      nonNullable: true,
    }),
    address: new FormControl(this.defaultValues()?.address || null),
    currency: new FormControl(this.defaultValues()?.currency || 'USD', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    avatar: new FormControl<File | null | undefined>(null),
  });

  //--- Properties ---

  fileBuffer = signal<string | ArrayBuffer | null>(null);

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

  constructor() {
    effect(async () => {
      const file = this.wizardService.updatedFileAvatar();

      if (!file) {
        this.fileBuffer.set(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.fileBuffer.set(reader.result);
      };
      reader.onerror = () => {
        this.fileBuffer.set(null);
      };

      reader.readAsArrayBuffer(file);
    });

    effect(() => {
      const values = this.defaultValues();
      if (values) {
        this.createCondominiumForm.patchValue({
          name: values.name,
          address: values.address,
          currency: values.currency,
        });
      }
    });
  }

  // --- Methods ---
  /** Returns true if the form is successfully submitted, false otherwise */
  onSubmit(): CreateCondominiumData | null {
    if (this.loading()) return null;

    const profileId = this.profileService.profile$.getValue()?.id;
    if (profileId == undefined) {
      throw new Error('Profile ID is required to create a condominium');
    }

    const avatarFile: File | null | undefined =
      this.createCondominiumForm.controls.avatar.value || null;
    if (this.createCondominiumForm.valid) {
      const valueToEmit = {
        ...this.createCondominiumForm.getRawValue(),
        avatar: avatarFile,
        owner_id: profileId,
      };
      this.submitCreateCondominiumForm.emit(valueToEmit);

      return valueToEmit;
    } else {
      Object.values(this.createCondominiumForm.controls).forEach((control) => {
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return null;
    }
  }

  selectAvatar(file: File | null) {
    if (file) {
      this.createCondominiumForm.controls.avatar.setValue(file);
    } else {
      this.createCondominiumForm.controls.avatar.setValue(null);
    }
  }
}
