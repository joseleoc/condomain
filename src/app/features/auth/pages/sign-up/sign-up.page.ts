import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@core/services/auth/auth';
import { SignUpFormComponent } from '@features/auth/components/sign-up-form/sign-up-form.component';
import { SignUpFormValue } from '@features/auth/types';
import { AlertController } from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '@shared/components/layout/auth-layout/auth-layout.component';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    SignUpFormComponent,

    TranslocoModule,
    RouterLink,
    AuthLayoutComponent,
  ],
})
export class SignUpPage implements OnInit {
  // --- Dependency Injection ---
  private authService = inject(Auth);
  private translocoService = inject(TranslocoService);
  private alertController = inject(AlertController);
  private router = inject(Router);

  // --- Constructor ---
  constructor() {}

  // --- Lifecycle Hooks ---
  ngOnInit() {}

  async onSubmitSignUpForm(event: SignUpFormValue) {
    const { email, password } = event;
    try {
      const result = await this.authService.signUpWithEmailAndPassword(
        email,
        password,
      );

      // TODO CONFIRM EMAIL
      if (result.session) {
        await this.router.navigate(['/home']);
      }
    } catch (error) {
      const message = (error as any)?.translationKey || 'auth.signUpError';
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
