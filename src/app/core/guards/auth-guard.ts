import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionService } from '../auth/sesion-service';

export const authGuard: CanActivateFn = (_route, state) =>
  inject(SesionService).token()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
