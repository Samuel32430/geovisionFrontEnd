import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión | Geo Vision',
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
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
        loadChildren: () =>
          import('./features/ventas/ventas.routes').then((m) => m.VENTAS_ROUTES),
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
    ],
  },
];
