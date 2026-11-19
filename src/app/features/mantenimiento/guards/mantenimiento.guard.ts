import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MantenimientoAccess } from '../services/mantenimiento-access.service';

export const mantenimientoGuard: CanActivateFn = () =>
  inject(MantenimientoAccess).permitido() || inject(Router).createUrlTree(['/inicio']);
