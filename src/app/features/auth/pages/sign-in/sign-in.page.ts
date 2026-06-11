import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignInFormComponent } from '@features/auth/components/sign-in-form/sign-in-form.component';
import { MainLayoutComponent } from '@features/layout/main-layout/main-layout.component';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SignInFormValue } from '@features/auth/types';
import { Auth } from '@features/auth/services/auth/auth';
import { AlertController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.page.html',
  styleUrls: ['./sign-in.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    SignInFormComponent,
    MainLayoutComponent,
    TranslocoModule,
  ],
})
export class SignInPage {
  // --- Dependency Injection ---
  private authService = inject(Auth);
  private translocoService = inject(TranslocoService);
  private alertController = inject(AlertController);

  // --- Methods ---
  async onSubmitSignInForm(event: SignInFormValue) {
    try {
      const { email, password } = event;
      const result = await this.authService.signInWithEmailAndPassword(
        email,
        password,
      );
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
