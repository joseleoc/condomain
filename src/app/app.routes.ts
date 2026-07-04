import { Routes } from '@angular/router';
import { isAuthenticatedGuard } from '@core/guards/is-authenticated/is-authenticated-guard';
import { isNotAuthenticatedGuard } from '@core/guards/is-not-authenticated/is-not-authenticated-guard';
import { hasCondominiumsGuard } from '@core/guards/has-condominiums/has-condominiums-guard';
import { captureInvitationCodeGuard } from '@core/guards/capture-invitation-code/capture-invitation-code-guard';
import { MainLayoutComponent } from '@shared/components/layout/main-layout/main-layout.component';

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
    path: 'app',
    canActivate: [isNotAuthenticatedGuard, hasCondominiumsGuard],
    component: MainLayoutComponent,
    data: {
      title: 'Condomain',
      showBackButton: false,
      defaultHref: '',
    },
    children: [
      {
        path: 'home',

        loadComponent: () =>
          import('./features/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'onboarding',
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
              import('./features/onboarding/join-condominium/join-condominium.page').then(
                (m) => m.JoinCondominiumPage,
              ),
          },
        ],
      },
      {
        path: 'condominium',
        children: [
          {
            path: 'condominium-hub',
            data: {
              showBackButton: true,
              defaultHref: '/app/home',
            },
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
          {
            path: '**',
            redirectTo: 'condominium-hub',
            pathMatch: 'full',
          },
        ],
      },
      {
        path: 'create-condominium',
        loadComponent: () =>
          import('./features/create-condominium/create-condominium.page').then(
            (m) => m.CreateCondominiumPage,
          ),
      },

      {
        path: 'financial',
        canActivate: [isNotAuthenticatedGuard],
        children: [
          {
            path: 'wallets',
            loadComponent: () =>
              import('./features/financial/pages/wallet-list/wallet-list.page').then(
                (m) => m.WalletListPage,
              ),
          },
          {
            path: 'categories',
            loadComponent: () =>
              import('./features/financial/pages/category-list/category-list.page').then(
                (m) => m.CategoryListPage,
              ),
          },
          {
            path: 'transactions',
            loadComponent: () =>
              import('./features/financial/pages/transaction-list/transaction-list.page').then(
                (m) => m.TransactionListPage,
              ),
          },
          {
            path: '',
            redirectTo: 'wallets',
            pathMatch: 'full',
          },
        ],
      },
    ],
  },
  {
    path: '',
    redirectTo: 'app/home',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'app/home',
    pathMatch: 'full',
  },
];
