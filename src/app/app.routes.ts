import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
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
        path: '',
        redirectTo: 'sign-in',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'sign-in',
    loadComponent: () =>
      import('./features/auth/pages/sign-in/sign-in.page').then(
        (m) => m.SignInPage,
      ),
  },
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
];
