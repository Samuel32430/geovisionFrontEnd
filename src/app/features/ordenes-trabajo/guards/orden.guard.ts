import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { OrdenAcceso } from '../services/orden-acceso.service';

export function ordenGuard() {
  return inject(OrdenAcceso).leer() || inject(Router).createUrlTree(['/inicio']);
}
