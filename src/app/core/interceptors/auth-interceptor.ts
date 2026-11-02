import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SesionService } from '../auth/sesion-service';
import { retornoSeguro } from '../auth/auth.model';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const base = environment.apiUrl.replace(/\/$/, '');
  if (!(request.url === base || request.url.startsWith(`${base}/`))) return next(request);
  const sesion = inject(SesionService);
  const router = inject(Router);
  const login = request.url.split('?')[0] === `${base}/auth/login`;
  const token = login ? null : sesion.token();
  const autenticada = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(autenticada).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !login &&
        (sesion.actual()?.token ?? null) === token
      ) {
        sesion.limpiar();
        if (!router.url.startsWith('/login'))
          void router.navigate(['/login'], {
            queryParams: { expirada: '1', returnUrl: retornoSeguro(router.url) },
          });
      }
      return throwError(() => error);
    }),
  );
};
