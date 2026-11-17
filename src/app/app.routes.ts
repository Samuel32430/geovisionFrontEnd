import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { mantenimientoGuard } from './features/mantenimiento/mantenimiento-access';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión | Geo Vision',
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: 'recuperar-password',
    title: 'Recuperar contraseña | Geo Vision',
    loadComponent: () =>
      import('./features/auth/pages/recuperar-password/recuperar-password').then(
        (m) => m.RecuperarPassword,
      ),
  },
  {
    path: 'reset-password',
    title: 'Restablecer contraseña | Geo Vision',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'auth/recuperar-password',
    redirectTo: 'recuperar-password',
  },
  {
    path: 'auth/reset-password',
    redirectTo: 'reset-password',
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: 'mantenimiento',
        canActivate: [mantenimientoGuard],
        title: 'Mantenimiento de catálogos | Geo Vision',
        loadComponent: () =>
          import('./features/mantenimiento/mantenimiento').then((m) => m.Mantenimiento),
      },
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/inicio/pages/dashboard/dashboard').then((m) => m.Dashboard),
        title: 'Inicio | Geo Vision',
      },
      {
        path: 'ventas',
        title: 'Ventas | Geo Vision',
        loadChildren: () => import('./features/ventas/ventas.routes').then((m) => m.VENTAS_ROUTES),
      },
      {
        path: 'inventario',
        title: 'Inventario y Stock | Geo Vision',
        loadChildren: () =>
          import('./features/inventario/inventario.routes').then((m) => m.INVENTARIO_ROUTES),
      },
      {
        path: 'ordenes-trabajo',
        loadChildren: () =>
          import('./features/ordenes-trabajo/ordenes.routes').then((m) => m.ORDENES_ROUTES),
      },
      {
        path: 'seguridad',
        loadChildren: () =>
          import('./features/seguridad/seguridad.routes').then((m) => m.SEGURIDAD_ROUTES),
      },
      {
        path: 'atencion-paciente-consulta',
        title: 'Atención al Paciente | Geo Vision',
        loadChildren: () =>
          import('./features/atencion-paciente-consulta/atencion-paciente-consulta.routes').then(
            (m) => m.ATENCION_PACIENTE_CONSULTA_ROUTES,
          ),
      },
      {
        path: 'configuracion',
        loadChildren: () =>
          import('./features/configuracion/configuracion.routes').then(
            (m) => m.CONFIGURACION_ROUTES,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'inicio',
  },
];
