import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { appSettings } from '../config';
import { SessionService } from './session.service';

/** Anexa o token às chamadas da API e encerra a sessão quando o backend responde 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const token = session.token();
  const isApi = req.url.startsWith(appSettings.apiUrl);
  const isAuthCall = req.url.includes('/authentication/');

  const request =
    isApi && token && !req.headers.has('Authorization')
      ? req.clone({ setHeaders: { Authorization: token } })
      : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isApi && !isAuthCall) {
        session.logout();
      }
      return throwError(() => error);
    }),
  );
};
