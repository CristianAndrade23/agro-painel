import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'painel' },
  {
    path: 'login',
    title: 'Entrar · AgroPainel',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login'),
  },
  {
    path: 'painel',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell'),
    children: [
      {
        path: '',
        title: 'Início · AgroPainel',
        loadComponent: () => import('./features/home/home'),
      },
      {
        path: 'usuarios',
        title: 'Usuários · AgroPainel',
        loadComponent: () => import('./features/users/users'),
      },
      {
        path: 'planos-a-vencer',
        title: 'Planos a vencer · AgroPainel',
        loadComponent: () => import('./features/expiring-plans/expiring-plans'),
      },
      {
        path: 'lavouras',
        title: 'Análise de lavouras · AgroPainel',
        loadComponent: () => import('./features/farming-analysis/farming-analysis'),
      },
      {
        path: 'grupos',
        title: 'Grupos de comparação · AgroPainel',
        loadComponent: () => import('./features/groups/groups'),
      },
    ],
  },
  { path: '**', redirectTo: 'painel' },
];
