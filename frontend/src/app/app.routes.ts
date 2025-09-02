import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then(c => c.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register').then(c => c.Register)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(c => c.Dashboard),
    canActivate: [authGuard]
  },
  {
    path: 'activities',
    loadComponent: () => import('./components/activities/activities').then(c => c.Activities),
    canActivate: [authGuard]
  },
  {
    path: 'badges',
    loadComponent: () => import('./components/badges/badges').then(c => c.Badges),
    canActivate: [authGuard]
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./components/leaderboard/leaderboard').then(c => c.Leaderboard),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
