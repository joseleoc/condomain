import { AsyncPipe } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { matchValidator } from '@core/validators/match-validator';
import { UpdatePasswordFormValue } from '@features/auth/types';
import { IonButton, IonCard, IonInput } from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs/internal/operators/map';

interface UpdatePasswordFormControls {
  newPassword: FormControl<string>;
  confirmNewPassword: FormControl<string>;
}

@Component({
  selector: 'app-update-password-form',
  templateUrl: './update-password-form.component.html',
  styleUrls: ['./update-password-form.component.scss'],
  imports: [
    ReactiveFormsModule,
    TranslocoModule,
    IonCard,
    IonInput,
    IonButton,
    AsyncPipe,
  ],
})
export class UpdatePasswordFormComponent {
  // --- Dependencies ---
  translocoService = inject(TranslocoService);

  // --- Outputs ---
  onUpdatePasswordSubmit = output<UpdatePasswordFormValue>();

  // --- Form ---
  updatePasswordForm = new FormGroup<UpdatePasswordFormControls>({
    newPassword: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(6),
        matchValidator('confirmNewPassword', true),
      ],
      nonNullable: true,
    }),
    confirmNewPassword: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(6),
        matchValidator('newPassword'),
      ],
      nonNullable: true,
    }),
  });

  // --- Properties ---

  newPasswordError$ =
    this.updatePasswordForm.controls.newPassword.statusChanges.pipe(
      map(() => {
        const passwordControl = this.updatePasswordForm.controls.newPassword;
        if (passwordControl.hasError('required')) {
          return this.translocoService.translate('validation.required');
        }
        if (passwordControl.hasError('minlength')) {
          return this.translocoService.translate('validation.minLength', {
            length: 6,
          });
        }
        if (passwordControl.hasError('matching')) {
          return this.translocoService.translate('validation.passwordMismatch');
        }
        return null;
      }),
    );

  confirmNewPasswordError$ =
    this.updatePasswordForm.controls.confirmNewPassword.statusChanges.pipe(
      map(() => {
        const confirmPasswordControl =
          this.updatePasswordForm.controls.confirmNewPassword;
        if (confirmPasswordControl.hasError('required')) {
          return this.translocoService.translate('validation.required');
        }
        if (confirmPasswordControl.hasError('minlength')) {
          return this.translocoService.translate('validation.minLength', {
            length: 6,
          });
        }
        if (confirmPasswordControl.hasError('matching')) {
          return this.translocoService.translate('validation.passwordMismatch');
        }
        return null;
      }),
    );

  // --- Methods ---
  onSubmit() {
    if (this.updatePasswordForm.valid) {
      const { newPassword, confirmNewPassword } = this.updatePasswordForm.value;
      this.onUpdatePasswordSubmit.emit({
        newPassword,
        confirmNewPassword,
      } as UpdatePasswordFormValue);
    } else {
      Object.values(this.updatePasswordForm.controls).forEach((control) => {
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity();

      });
    }
  }
}
