import { Routes } from '@angular/router';
import { ordenGuard } from './guards/orden.guard';

export const ORDENES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [ordenGuard],
    title: 'Órdenes de trabajo | Geo Vision',
    loadComponent: () => import('./pages/orden-lista/orden-lista').then((m) => m.OrdenLista),
  },
  {
    path: ':id',
    canActivate: [ordenGuard],
    title: 'Detalle de orden | Geo Vision',
    loadComponent: () => import('./pages/orden-detalle/orden-detalle').then((m) => m.OrdenDetalle),
  },
];
