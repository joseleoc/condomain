import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@core/services/auth/auth';
import { SignUpFormComponent } from '@features/auth/components/sign-up-form/sign-up-form.component';
import { MainLayoutComponent } from '@features/layout/main-layout/main-layout.component';
import { SignUpFormValue } from '@features/auth/types';
import { AlertController } from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    SignUpFormComponent,
    MainLayoutComponent,
    TranslocoModule,
  ],
})
export class SignUpPage implements OnInit {
  // --- Dependency Injection ---
  private authService = inject(Auth);
  private translocoService = inject(TranslocoService);
  private alertController = inject(AlertController);

  // -- State ---

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
    } catch (error) {
      const alert = await this.alertController.create({
        header: this.translocoService.translate('common.error'),
        message: this.translocoService.translate('auth.signUpError'),
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
