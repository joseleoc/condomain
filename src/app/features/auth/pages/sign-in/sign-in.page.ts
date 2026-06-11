import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignInFormComponent } from '@features/auth/components/sign-in-form/sign-in-form.component';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SignInFormValue } from '@features/auth/types';
import { Auth } from '@core/services/auth/auth';
import { AlertController } from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '@shared/components/layout/auth-layout/auth-layout.component';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.page.html',
  styleUrls: ['./sign-in.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    SignInFormComponent,
    TranslocoModule,
    RouterLink,
    AuthLayoutComponent,
  ],
})
export class SignInPage {
  // --- Dependency Injection ---
  private authService = inject(Auth);
  private translocoService = inject(TranslocoService);
  private alertController = inject(AlertController);
  private router = inject(Router);

  // --- Methods ---
  async onSubmitSignInForm(event: SignInFormValue) {
    try {
      const { email, password } = event;
      const result = await this.authService.signInWithEmailAndPassword(
        email,
        password,
      );
      await this.router.navigate(['/home'], { replaceUrl: true });
    } catch (error) {
      const alert = await this.alertController.create({
        header: this.translocoService.translate('common.error'),
        message: this.translocoService.translate('auth.signInError'),
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
