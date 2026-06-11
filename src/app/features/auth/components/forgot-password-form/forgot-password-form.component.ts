import { Component, OnInit, output } from '@angular/core';
import { ForgotPasswordFormValue } from '@features/auth/types';

@Component({
  selector: 'app-forgot-password-form',
  templateUrl: './forgot-password-form.component.html',
  styleUrls: ['./forgot-password-form.component.scss'],
})
export class ForgotPasswordFormComponent {
  // --- Outputs ---
  submitForgotPasswordForm = output<ForgotPasswordFormValue>();
}
