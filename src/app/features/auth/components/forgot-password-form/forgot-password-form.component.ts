import { AsyncPipe } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ForgotPasswordFormValue } from '@features/auth/types';
import { IonInput, IonButton, IonCard } from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs';

interface ForgotPasswordFormControls {
  email: FormControl<string>;
}

@Component({
  selector: 'app-forgot-password-form',
  templateUrl: './forgot-password-form.component.html',
  styleUrls: ['./forgot-password-form.component.scss'],
  imports: [
    ReactiveFormsModule,
    IonInput,
    IonButton,
    IonCard,
    TranslocoModule,
    AsyncPipe,
  ],
})
export class ForgotPasswordFormComponent {
  // --- Dependencies ---
  private translocoService = inject(TranslocoService);

  // --- Outputs ---
  submitForgotPasswordForm = output<ForgotPasswordFormValue>();

  // --- Form ---
  forgotPasswordForm = new FormGroup<ForgotPasswordFormControls>({
    email: new FormControl('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true,
    }),
  });

  // --- Properties ---
  emailError$ = this.forgotPasswordForm.controls.email.statusChanges.pipe(
    map(() => {
      const emailControl = this.forgotPasswordForm.controls.email;
      if (emailControl.hasError('required')) {
        return this.translocoService.translate('validation.required');
      }
      if (emailControl.hasError('email')) {
        return this.translocoService.translate('validation.email');
      }
      return null;
    }),
  );

  // --- Methods ---
  onSubmit() {
    console.log(this.forgotPasswordForm);
    if (this.forgotPasswordForm.valid) {
      this.submitForgotPasswordForm.emit(this.forgotPasswordForm.getRawValue());
    } else {
      Object.values(this.forgotPasswordForm.controls).forEach((control) => {
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity();
      });
    }
  }
}
