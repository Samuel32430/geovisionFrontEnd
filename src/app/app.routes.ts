import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
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
