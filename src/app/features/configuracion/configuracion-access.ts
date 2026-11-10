import { computed, inject, Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionService } from '../../core/auth/sesion-service';

export function gestionaConfiguracion(
  sesion: { roles: string[]; permisos: string[] } | null,
): boolean {
  return (
    !!sesion &&
    (sesion.permisos.includes('MANTENIMIENTO_GESTIONAR') ||
      sesion.roles.some((rol) =>
        ['ADMIN', 'ADMINISTRADOR'].includes(rol.replace(/^ROLE_/, '').toUpperCase()),
      ))
  );
}

@Injectable({ providedIn: 'root' })
export class ConfiguracionAccess {
  private readonly sesion = inject(SesionService);
  readonly permitido = computed(() => gestionaConfiguracion(this.sesion.actual()));
}

export const configuracionGuard: CanActivateFn = () =>
  inject(ConfiguracionAccess).permitido() || inject(Router).createUrlTree(['/inicio']);
