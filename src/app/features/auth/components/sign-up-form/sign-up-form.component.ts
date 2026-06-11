import { Component, inject, output } from '@angular/core';
import {
  IonInput,
  IonButton,
  IonInputPasswordToggle,
  IonCard,
  IonCardHeader,
  IonCardTitle,
} from '@ionic/angular/standalone';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { matchValidator } from '@core/validators/match-validator';
import { map } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { SignUpFormValue } from '@features/auth/types';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

interface SignUpFormControls {
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}

@Component({
  selector: 'app-sign-up-form',
  templateUrl: './sign-up-form.component.html',
  styleUrls: ['./sign-up-form.component.scss'],
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
export class SignUpFormComponent {
  // --- Dependencies ---
  private translocoService = inject(TranslocoService);

  // --- Outputs ---
  submitSignUpForm = output<SignUpFormValue>();

  // --- Form ---
  signUpForm = new FormGroup<SignUpFormControls>({
    email: new FormControl<string>('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true,
    }),
    password: new FormControl<string>('', {
      validators: [
        Validators.required,
        Validators.minLength(6),
        matchValidator('confirmPassword', true),
      ],
      nonNullable: true,
    }),
    confirmPassword: new FormControl<string>('', {
      validators: [
        Validators.required,
        Validators.minLength(6),
        matchValidator('password'),
      ],
      nonNullable: true,
    }),
  });

  // --- Properties ---
  emailError$ = this.signUpForm.controls.email.statusChanges.pipe(
    map(() => {
      const emailControl = this.signUpForm.controls.email;
      if (emailControl.hasError('required')) {
        return this.translocoService.translate('validation.required');
      }
      if (emailControl.hasError('email')) {
        return this.translocoService.translate('validation.email');
      }
      return null;
    }),
  );

  passwordError$ = this.signUpForm.controls.password.statusChanges.pipe(
    map(() => {
      const passwordControl = this.signUpForm.controls.password;
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

  confirmPasswordError$ =
    this.signUpForm.controls.confirmPassword.statusChanges.pipe(
      map(() => {
        const confirmPasswordControl = this.signUpForm.controls.confirmPassword;
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
    if (this.signUpForm.valid) {
      this.submitSignUpForm.emit(this.signUpForm.getRawValue());
    } else {
      Object.values(this.signUpForm.controls).forEach((control) => {
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity();
      });
    }
  }
}
