import { Routes } from '@angular/router';
import { inventarioGuard } from '../../core/guards/permiso-guard';

export const INVENTARIO_ROUTES: Routes = [
  {
    path: '',
    canActivate: [inventarioGuard],
    title: 'Control de Inventario y Stock | Geo Vision',
    loadComponent: () =>
      import('./pages/inventario-stock/inventario-stock').then((m) => m.InventarioStock),
  },
];
