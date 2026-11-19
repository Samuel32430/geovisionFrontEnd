import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionService } from '../auth/sesion-service';

export function crearPermisoGuard(permisos: string | readonly string[]): CanActivateFn {
  return () => {
    const sesion = inject(SesionService);
    const router = inject(Router);
    return sesion.tienePermiso(permisos) || router.createUrlTree(['/inicio']);
  };
}

export const reportesGuard = crearPermisoGuard('REPORTES_VER');
export const inventarioGuard = crearPermisoGuard(['INVENTARIO_LEER', 'PRODUCTOS_LEER']);
export const ventasNuevaGuard = crearPermisoGuard('VENTAS_REGISTRAR');
export const ventasHistorialGuard = crearPermisoGuard('VENTAS_LEER');
export const pagosPendientesGuard = crearPermisoGuard('PAGOS_GESTIONAR');
