import { Routes } from '@angular/router';
import {
  pagosPendientesGuard,
  reportesGuard,
  ventasHistorialGuard,
  ventasNuevaGuard,
} from '../../core/guards/permiso-guard';

export const VENTAS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'historial',
  },
  {
    path: 'nueva',
    canActivate: [ventasNuevaGuard],
    title: 'Registrar Venta | Geo Vision',
    loadComponent: () => import('./pages/nueva-venta/nueva-venta').then((m) => m.NuevaVenta),
  },
  {
    path: 'historial',
    canActivate: [ventasHistorialGuard],
    title: 'Historial de Ventas | Geo Vision',
    loadComponent: () =>
      import('./pages/venta-historial/venta-historial').then((m) => m.VentaHistorial),
  },
  {
    path: 'pagos-pendientes',
    canActivate: [pagosPendientesGuard],
    title: 'Gestión de Pagos Pendientes | Geo Vision',
    loadComponent: () =>
      import('./pages/pagos-pendientes/pagos-pendientes').then((m) => m.PagosPendientes),
  },
  {
    path: 'reportes',
    canActivate: [reportesGuard],
    title: 'Reportes de Ventas | Geo Vision',
    loadComponent: () =>
      import('./pages/reporte-ventas/reporte-ventas').then((m) => m.ReporteVentas),
  },
];
