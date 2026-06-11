import { AsyncPipe } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SignInFormValue } from '@features/auth/types';
import {
  IonInput,
  IonButton,
  IonInputPasswordToggle,
  IonCard,
  IonCardHeader,
  IonCardTitle,
} from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs';

interface SignInFormControls {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-sign-in-form',
  templateUrl: './sign-in-form.component.html',
  styleUrls: ['./sign-in-form.component.scss'],
  imports: [
    ReactiveFormsModule,
    IonInput,
    IonButton,
    IonInputPasswordToggle,
    IonCard,
    AsyncPipe,
    TranslocoModule,
    IonCardHeader,
    IonCardTitle,
  ],
})
export class SignInFormComponent {
  // --- Dependencies ---
  private translocoService = inject(TranslocoService);

  // --- Form ---
  signInForm = new FormGroup<SignInFormControls>({
    email: new FormControl<string>('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true,
    }),
    password: new FormControl<string>('', {
      validators: [Validators.required, Validators.minLength(6)],
      nonNullable: true,
    }),
  });

  // --- Outputs ---
  submitSignInForm = output<SignInFormValue>();

  // --- Properties ---
  emailError$ = this.signInForm.controls.email.statusChanges.pipe(
    map(() => {
      const emailControl = this.signInForm.controls.email;
      if (emailControl.hasError('required')) {
        return this.translocoService.translate('validation.required');
      }
      if (emailControl.hasError('email')) {
        return this.translocoService.translate('validation.email');
      }
      return null;
    }),
  );

  passwordError$ = this.signInForm.controls.password.statusChanges.pipe(
    map(() => {
      const passwordControl = this.signInForm.controls.password;
      if (passwordControl.hasError('required')) {
        return this.translocoService.translate('validation.required');
      }
      if (passwordControl.hasError('minlength')) {
        return this.translocoService.translate('validation.minLength', {
          length: 6,
        });
      }
      return null;
    }),
  );

  // --- Methods ---
  onSubmit() {
    if (this.signInForm.valid) {
      this.submitSignInForm.emit(this.signInForm.getRawValue());
    } else {
      Object.values(this.signInForm.controls).forEach((control) => {
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity();
      });
    }
  }
}
