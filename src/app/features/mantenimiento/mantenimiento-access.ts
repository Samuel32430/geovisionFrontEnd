import { computed, inject, Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionService } from '../../core/auth/sesion-service';

@Injectable({ providedIn: 'root' })
export class MantenimientoAccess {
  private readonly sesion = inject(SesionService);
  readonly permitido = computed(
    () => this.sesion.actual()?.permisos.includes('MANTENIMIENTO_GESTIONAR') ?? false,
  );
}

export const mantenimientoGuard: CanActivateFn = () =>
  inject(MantenimientoAccess).permitido() || inject(Router).createUrlTree(['/inicio']);
