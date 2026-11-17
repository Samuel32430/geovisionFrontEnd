import { Routes } from '@angular/router';
import { configuracionGuard } from './configuracion-access';

export const CONFIGURACION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [configuracionGuard],
    title: 'Configuración de la Empresa | Geo Vision',
    loadComponent: () =>
      import('./pages/empresa/configuracion-empresa').then((m) => m.ConfiguracionEmpresaPage),
  },
];
