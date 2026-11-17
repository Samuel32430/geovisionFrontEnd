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
    path: 'pacientes/:id/examen-visual',
    title: 'Nuevo examen visual | Geo Vision',
    canDeactivate: [cambiosPacienteGuard],
    loadComponent: () => import('./pages/examen-visual/examen-visual').then((m) => m.ExamenVisual),
  },
  {
    path: 'pacientes/:id/receta-externa',
    title: 'Registrar receta externa | Geo Vision',
    canDeactivate: [cambiosPacienteGuard],
    loadComponent: () =>
      import('./pages/receta-externa/receta-externa').then((m) => m.RecetaExterna),
  },
  {
    path: 'pacientes/:id/recetas/:idReceta/lentes',
    title: 'Configurar lentes | Geo Vision',
    canDeactivate: [cambiosPacienteGuard],
    loadComponent: () =>
      import('./pages/configurar-lentes/configurar-lentes').then((m) => m.ConfigurarLentes),
  },
  {
    path: 'pacientes/:id/historial',
    title: 'Historial clínico | Geo Vision',
    loadComponent: () =>
      import('./pages/paciente-historial/paciente-historial').then((m) => m.PacienteHistorial),
  },
  {
    path: 'pacientes/:id',
    title: 'Perfil del paciente | Geo Vision',
    loadComponent: () =>
      import('./pages/paciente-perfil/paciente-perfil').then((m) => m.PacientePerfil),
  },
];
