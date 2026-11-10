import { Routes } from '@angular/router';

export const INVENTARIO_ROUTES: Routes = [
  {
    path: '',
    title: 'Control de Inventario y Stock | Geo Vision',
    loadComponent: () =>
      import('./pages/inventario-stock/inventario-stock').then((m) => m.InventarioStock),
  },
];
