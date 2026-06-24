import { Routes } from '@angular/router';
import { isAuthenticatedGuard } from '@core/guards/is-authenticated/is-authenticated-guard';
import { isNotAuthenticatedGuard } from '@core/guards/is-not-authenticated/is-not-authenticated-guard';
import { hasCondominiumsGuard } from '@core/guards/has-condominiums/has-condominiums-guard';
import { captureInvitationCodeGuard } from '@core/guards/capture-invitation-code/capture-invitation-code-guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [isAuthenticatedGuard],
    children: [
      {
        path: 'sign-up',
        loadComponent: () =>
          import('./features/auth/pages/sign-up/sign-up.page').then(
            (m) => m.SignUpPage,
          ),
      },
      {
        path: 'sign-in',
        loadComponent: () =>
          import('./features/auth/pages/sign-in/sign-in.page').then(
            (m) => m.SignInPage,
          ),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/pages/forgot-password/forgot-password.page').then(
            (m) => m.ForgotPasswordPage,
          ),
      },
      {
        path: 'update-password',
        loadComponent: () =>
          import('./features/auth/pages/update-password/update-password.page').then(
            (m) => m.UpdatePasswordPage,
          ),
      },
      {
        path: '',
        redirectTo: 'sign-in',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'home',
    canActivate: [isNotAuthenticatedGuard, hasCondominiumsGuard],
    loadComponent: () =>
      import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'onboarding',
    canActivate: [isNotAuthenticatedGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/onboarding/onboarding.page').then(
            (m) => m.OnboardingPage,
          ),
      },
      {
        path: 'join-condominium',
        canActivate: [captureInvitationCodeGuard],
        loadComponent: () =>
          import(
            './features/onboarding/join-condominium/join-condominium.page'
          ).then((m) => m.JoinCondominiumPage),
      },
    ],
  },
  {
    path: 'condominium',
    canActivate: [isNotAuthenticatedGuard],
    children: [
      {
        path: 'condominium-hub',
        loadComponent: () =>
          import('./features/condominium/condominium-hub/condominium-hub.page').then(
            (m) => m.CondominiumHubPage,
          ),
      },
      {
        path: 'join-requests',
        loadComponent: () =>
          import('./features/condominium/join-requests/join-requests.page').then(
            (m) => m.JoinRequestsPage,
          ),
      },
      {
        path: '',
        redirectTo: 'condominium-hub',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'create-condominium',
    canActivate: [isNotAuthenticatedGuard],
    loadComponent: () =>
      import('./features/create-condominium/create-condominium.page').then(
        (m) => m.CreateCondominiumPage,
      ),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
