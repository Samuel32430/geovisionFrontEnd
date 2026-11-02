import { Routes } from '@angular/router';
import { cambiosSeguridadGuard, seguridadGuard } from './seguridad-access';

export const SEGURIDAD_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
  {
    path: 'usuarios',
    title: 'Gestión de Usuarios | Geo Vision',
    canActivate: [seguridadGuard],
    canDeactivate: [cambiosSeguridadGuard],
    loadComponent: () => import('./usuarios/usuarios').then((m) => m.Usuarios),
  },
  {
    path: 'usuarios/nuevo',
    title: 'Nuevo usuario | Geo Vision',
    canActivate: [seguridadGuard],
    canDeactivate: [cambiosSeguridadGuard],
    loadComponent: () => import('./usuario-nuevo/usuario-nuevo').then((m) => m.UsuarioNuevo),
  },
  {
    path: 'usuarios/:id/editar',
    title: 'Editar usuario | Geo Vision',
    canActivate: [seguridadGuard],
    canDeactivate: [cambiosSeguridadGuard],
    loadComponent: () => import('./usuario-form/usuario-form').then((m) => m.UsuarioForm),
  },
  {
    path: 'roles',
    title: 'Roles y Permisos | Geo Vision',
    canActivate: [seguridadGuard],
    canDeactivate: [cambiosSeguridadGuard],
    loadComponent: () => import('./roles/roles').then((m) => m.Roles),
  },
];
