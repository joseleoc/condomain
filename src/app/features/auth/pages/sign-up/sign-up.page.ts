import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth/auth';
import { SignUpFormComponent } from '@features/auth/components/sign-up-form/sign-up-form.component';
import { MainLayoutComponent } from '@features/layout/main-layout/main-layout.component';

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

  // -- State ---

  // --- Constructor ---
  constructor() {}

  // --- Lifecycle Hooks ---
  ngOnInit() {}

  onSubmitSignUpForm(event: any) {
    console.log(event);
  }
}
