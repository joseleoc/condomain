import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@features/auth/services/auth/auth';
import { SignUpFormComponent } from '@features/auth/components/sign-up-form/sign-up-form.component';
import { MainLayoutComponent } from '@features/layout/main-layout/main-layout.component';
import { SignUpFormValue } from '@features/auth/types';
import { AlertController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
  standalone: true,
  imports: [CommonModule, SignUpFormComponent, MainLayoutComponent],
})
export class SignUpPage implements OnInit {
  // --- Dependency Injection ---
  private authService = inject(Auth);
  private alertController = inject(AlertController);

  // -- State ---

  // --- Constructor ---
  constructor() {}

  // --- Lifecycle Hooks ---
  ngOnInit() {}

  async onSubmitSignUpForm(event: SignUpFormValue) {
    const { email, password } = event;
    try {
      console.log(event);
      const result = await this.authService.signUpWithEmailAndPassword(
        email,
        password,
      );
      console.log(result);
    } catch (error) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'An error occurred during sign up.',
        buttons: [{ text: 'OK', role: 'cancel' }],
      });
      await alert.present();
    }
  }
}
