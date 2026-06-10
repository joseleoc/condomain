import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
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
];
