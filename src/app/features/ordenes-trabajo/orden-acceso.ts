import { computed, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SesionService } from '../../core/auth/sesion-service';

@Injectable({ providedIn: 'root' })
export class OrdenAcceso {
  private readonly sesion = inject(SesionService);
  readonly leer = computed(() => this.permite('ORDENES_TRABAJO_LEER'));
  readonly gestionar = computed(() => this.permite('ORDENES_TRABAJO_GESTIONAR'));
  readonly calidad = computed(() => this.permite('ORDENES_TRABAJO_CALIDAD'));

  private permite(permiso: string): boolean {
    return this.sesion.actual()?.permisos.includes(permiso) ?? false;
  }
}

export function ordenGuard() {
  return inject(OrdenAcceso).leer() || inject(Router).createUrlTree(['/inicio']);
}
