import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ForgotPasswordFormComponent } from '@features/auth/components/forgot-password-form/forgot-password-form.component';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ForgotPasswordFormValue } from '@features/auth/types';
import { Auth } from '@core/services/auth/auth';
import { AlertController } from '@ionic/angular/standalone';
import { AuthLayoutComponent } from '@shared/components/layout/auth-layout/auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [
    AuthLayoutComponent,
    TranslocoModule,
    RouterLink,
    ForgotPasswordFormComponent,
  ],
})
export class ForgotPasswordPage {
  // --- Dependencies ---
  private authService = inject(Auth);
  private alertController = inject(AlertController);
  private translocoService = inject(TranslocoService);
  private router = inject(Router);

  // --- Methods ---
  async onSubmitForgotPasswordForm(event: ForgotPasswordFormValue) {
    try {
      await this.authService.resetPasswordForEmail(event.email);

      const successAlert = await this.alertController.create({
        header: this.translocoService.translate('common.sent'),
        message: this.translocoService.translate(
          'auth.forgotPassword.resetPasswordSuccess',
        ),
        buttons: [
          {
            text: this.translocoService.translate('common.ok'),
            role: 'destructive',
            handler: () => {
              this.router.navigate(['/auth/sign-in']);
            },
          },
        ],
      });
      await successAlert.present();
    } catch (error) {
      const alert = await this.alertController.create({
        header: this.translocoService.translate('common.error'),
        message: this.translocoService.translate(
          'auth.forgotPassword.resetPasswordError',
        ),
        buttons: [this.translocoService.translate('common.ok')],
      });
      await alert.present();
    }
  }
}
