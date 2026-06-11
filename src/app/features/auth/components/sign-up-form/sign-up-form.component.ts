import { Component, output } from '@angular/core';
import {
  IonInput,
  IonButton,
  IonInputPasswordToggle,
  IonCard,
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
import { TranslocoDirective, TranslocoModule } from '@jsverse/transloco';

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
    TranslocoDirective,
    TranslocoModule,
  ],
})
export class SignUpFormComponent {
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

  // --- Signals ---
  emailError$ = this.signUpForm.controls.email.statusChanges.pipe(
    map(() => {
      const emailControl = this.signUpForm.controls.email;
      if (emailControl.hasError('required')) {
        return 'Email is required';
      }
      if (emailControl.hasError('email')) {
        return 'Please enter a valid email address';
      }
      return null;
    }),
  );

  passwordError$ = this.signUpForm.controls.password.statusChanges.pipe(
    map(() => {
      const passwordControl = this.signUpForm.controls.password;
      if (passwordControl.hasError('required')) {
        return 'Password is required';
      }
      if (passwordControl.hasError('minlength')) {
        return 'Password must be at least 6 characters long';
      }
      if (passwordControl.hasError('matching')) {
        return 'Passwords do not match';
      }
      return null;
    }),
  );

  confirmPasswordError$ =
    this.signUpForm.controls.confirmPassword.statusChanges.pipe(
      map(() => {
        const confirmPasswordControl = this.signUpForm.controls.confirmPassword;
        if (confirmPasswordControl.hasError('required')) {
          return 'Confirm Password is required';
        }
        if (confirmPasswordControl.hasError('minlength')) {
          return 'Confirm Password must be at least 6 characters long';
        }
        if (confirmPasswordControl.hasError('matching')) {
          return 'Passwords do not match';
        }
        return null;
      }),
    );

  // --- Constructor ---
  constructor() {}

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
