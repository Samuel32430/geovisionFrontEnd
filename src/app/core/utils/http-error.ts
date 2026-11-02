import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

export function mensajeErrorHttp(error: unknown): string {
  if (error instanceof TimeoutError)
    return 'El servidor tardó demasiado en responder. Intenta nuevamente.';
  if (!(error instanceof HttpErrorResponse))
    return 'No se pudo completar la solicitud. Intenta nuevamente.';
  if (error.status === 0)
    return 'No se pudo conectar con el servidor. Comprueba que el backend esté disponible.';
  if (error.status === 401)
    return 'Inicia sesión nuevamente para continuar. Tu sesión no está disponible o ha expirado.';
  if (error.status === 403)
    return 'No tienes autorización para esta operación. Se requiere una sesión con los permisos de pacientes.';
  const cuerpo: unknown = error.error;
  if (
    cuerpo &&
    typeof cuerpo === 'object' &&
    'message' in cuerpo &&
    typeof cuerpo.message === 'string'
  )
    return cuerpo.message;
  return 'No se pudo completar la solicitud. Intenta nuevamente.';
}
