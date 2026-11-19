import { Routes } from '@angular/router';
import { mantenimientoGuard } from './guards/mantenimiento.guard';

export const MANTENIMIENTO_ROUTES: Routes = [
  {
    path: '',
    canActivate: [mantenimientoGuard],
    title: 'Mantenimiento de catálogos | Geo Vision',
    loadComponent: () =>
      import('./pages/mantenimiento/mantenimiento').then((m) => m.Mantenimiento),
  },
];
