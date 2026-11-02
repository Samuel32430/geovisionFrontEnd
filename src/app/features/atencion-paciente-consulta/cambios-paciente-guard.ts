import { CanDeactivateFn } from '@angular/router';

export const cambiosPacienteGuard: CanDeactivateFn<{ puedeSalir(): boolean | Promise<boolean> }> = (
  component,
) => component.puedeSalir();
