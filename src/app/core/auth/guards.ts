import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/** Bloqueia o painel para quem não está autenticado. */
export const authGuard: CanActivateFn = () =>
  inject(SessionService).isLoggedIn() || inject(Router).createUrlTree(['/login']);

/** Evita que um usuário já autenticado volte para a tela de login. */
export const guestGuard: CanActivateFn = () =>
  !inject(SessionService).isLoggedIn() || inject(Router).createUrlTree(['/painel']);
