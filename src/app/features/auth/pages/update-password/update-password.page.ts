import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { UpdatePasswordFormComponent } from '@features/auth/components/update-password-form/update-password-form.component';
import { Auth } from '@core/services/auth/auth';
import { AlertController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthLayoutComponent } from "@shared/components/layout/auth-layout/auth-layout.component";

@Component({
  selector: 'app-update-password',
  templateUrl: './update-password.page.html',
  styleUrls: ['./update-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    UpdatePasswordFormComponent,
    AuthLayoutComponent
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
      throw new Error('Simulated error'); // TODO: Remove this line after testing the error handling
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
            }
          },
        ],
      });
      await alert.present();
    } catch (error) {
      console.log(error);
      const alert = await this.alertController.create({
        header: this.translocoService.translate('common.error'),
        message: this.translocoService.translate(
          'auth.updatePassword.updatePasswordError',
        ),
        buttons: [this.translocoService.translate('common.ok')],
      });
      await alert.present();
    }
  }
}
