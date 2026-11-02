import { Routes } from '@angular/router';
import { cambiosPacienteGuard } from './cambios-paciente-guard';

export const ATENCION_PACIENTE_CONSULTA_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'pacientes',
  },
  {
    path: 'pacientes',
    loadComponent: () => import('./pages/paciente-list/paciente-list').then((m) => m.PacienteList),
  },
  {
    path: 'pacientes/nuevo',
    title: 'Nuevo paciente | Geo Vision',
    canDeactivate: [cambiosPacienteGuard],
    loadComponent: () => import('./pages/paciente-form/paciente-form').then((m) => m.PacienteForm),
  },
  {
    path: 'pacientes/:id/editar',
    title: 'Editar paciente | Geo Vision',
    canDeactivate: [cambiosPacienteGuard],
    loadComponent: () => import('./pages/paciente-form/paciente-form').then((m) => m.PacienteForm),
  },
  {
    path: 'pacientes/:id',
    title: 'Perfil del paciente | Geo Vision',
    loadComponent: () =>
      import('./pages/paciente-perfil/paciente-perfil').then((m) => m.PacientePerfil),
  },
];
