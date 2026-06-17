import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { UpdatePasswordFormComponent } from '@features/auth/components/update-password-form/update-password-form.component';
import { Auth } from '@core/services/auth/auth';
import { AlertController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthLayoutComponent } from '@shared/components/layout/auth-layout/auth-layout.component';

@Component({
  selector: 'app-update-password',
  templateUrl: './update-password.page.html',
  styleUrls: ['./update-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    UpdatePasswordFormComponent,
    AuthLayoutComponent,
  ],
})
export class UpdatePasswordPage {
  // --- Dependencies ---
  private authService = inject(Auth);
  private alertController = inject(AlertController);
  private translocoService = inject(TranslocoService);
  private router = inject(Router);

  // --- Methods ---
  async onUpdatePasswordSubmit({ newPassword }: { newPassword: string }) {
    try {
      await this.authService.updatePassword(newPassword);

      const alert = await this.alertController.create({
        header: this.translocoService.translate('common.success'),
        message: this.translocoService.translate(
          'auth.updatePassword.updatePasswordSuccess',
        ),
        buttons: [
          {
            text: this.translocoService.translate('common.ok'),
            role: 'destructive',
            handler: () => {
              this.authService.signOut();
              this.router.navigate(['/auth/sign-in'], { replaceUrl: true });
            },
          },
        ],
      });
      await alert.present();
    } catch (error) {
      console.error(error);
      const message =
        (error as any)?.translationKey ||
        'auth.updatePassword.updatePasswordError';
      const alert = await this.alertController.create({
        header: this.translocoService.translate('common.error'),
        message: this.translocoService.translate(message),
        buttons: [
          {
            text: this.translocoService.translate('common.ok'),
            role: 'cancel',
          },
        ],
      });
      await alert.present();
    }
  }
}
