import { computed, inject, Injectable } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { SesionService } from '../../core/auth/sesion-service';
import { SeguridadApi } from './seguridad-api';
import { tap } from 'rxjs';

export function administraSeguridad(
  sesion: { roles: string[]; permisos: string[] } | null,
): boolean {
  return (
    !!sesion &&
    (sesion.permisos.includes('SEGURIDAD_ADMINISTRAR') ||
      sesion.roles.some((rol) =>
        ['ADMIN', 'ADMINISTRADOR'].includes(rol.replace(/^ROLE_/, '').toUpperCase()),
      ))
  );
}

@Injectable({ providedIn: 'root' })
export class SeguridadAccess {
  private readonly sesion = inject(SesionService);
  private readonly api = inject(SeguridadApi);
  readonly permitido = computed(() => administraSeguridad(this.sesion.actual()));
  refrescar() {
    return this.api.perfil().pipe(
      tap((usuario) => {
        const actual = this.sesion.actual();
        if (!actual || actual.idUsuario !== usuario.idUsuario) return;
        this.sesion.iniciar({
          ...actual,
          username: usuario.nombre,
          correo: usuario.correo,
          nombreCompleto: usuario.nombreCompletoPersona,
          idPersona: usuario.idPersona,
          roles: usuario.roles.map((r) => r.nombre),
          permisos: [...new Set(usuario.roles.flatMap((r) => r.permisos.map((p) => p.nombre)))],
        });
      }),
    );
  }
}

export const seguridadGuard: CanActivateFn = () =>
  inject(SeguridadAccess).permitido() || inject(Router).createUrlTree(['/inicio']);

export const cambiosSeguridadGuard: CanDeactivateFn<{
  puedeSalir(): boolean | Promise<boolean>;
}> = (componente) => !inject(SesionService).token() || componente.puedeSalir();
