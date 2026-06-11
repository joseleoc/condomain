import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MainLayoutComponent } from '@features/layout/main-layout/main-layout.component';
import { ForgotPasswordFormComponent } from '@features/auth/components/forgot-password-form/forgot-password-form.component';
import { TranslocoModule } from '@jsverse/transloco';
import { ForgotPasswordFormValue } from '@features/auth/types';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, ForgotPasswordFormComponent]
})
export class ForgotPasswordPage  {


  // --- Methods ---
  onSubmitForgotPasswordForm(event: ForgotPasswordFormValue) {}

  

}
