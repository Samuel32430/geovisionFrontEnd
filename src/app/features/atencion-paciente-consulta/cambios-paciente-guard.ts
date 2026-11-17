import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { SesionService } from '../../core/auth/sesion-service';

export const cambiosPacienteGuard: CanDeactivateFn<{ puedeSalir(): boolean | Promise<boolean> }> = (
  component,
) => !inject(SesionService).token() || component.puedeSalir();
