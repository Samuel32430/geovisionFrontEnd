import { Routes } from '@angular/router';
import { ordenGuard } from './orden-acceso';

export const ORDENES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [ordenGuard],
    title: 'Órdenes de trabajo | Geo Vision',
    loadComponent: () => import('./orden-lista').then((m) => m.OrdenLista),
  },
  {
    path: ':id',
    canActivate: [ordenGuard],
    title: 'Detalle de orden | Geo Vision',
    loadComponent: () => import('./orden-detalle').then((m) => m.OrdenDetalle),
  },
];
