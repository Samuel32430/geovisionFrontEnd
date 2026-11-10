import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoginResponseApi, retornoSeguro, Sesion } from './auth.model';

const CLAVE = 'geovision.sesion.v1';

function esLogin(valor: unknown): valor is LoginResponseApi {
  if (!valor || typeof valor !== 'object') return false;
  const datos = valor as Record<string, unknown>;
  return (
    typeof datos['token'] === 'string' &&
    datos['tipoToken'] === 'Bearer' &&
    typeof datos['username'] === 'string' &&
    typeof datos['nombreCompleto'] === 'string' &&
    typeof datos['correo'] === 'string' &&
    Number.isSafeInteger(datos['id'] ?? datos['idUsuario']) &&
    (datos['idPersona'] === null || Number.isSafeInteger(datos['idPersona'])) &&
    Array.isArray(datos['roles']) &&
    datos['roles'].every((rol: unknown) => typeof rol === 'string') &&
    Array.isArray(datos['permisos']) &&
    datos['permisos'].every((permiso: unknown) => typeof permiso === 'string')
  );
}

@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly router = inject(Router);
  private readonly estado = signal<Sesion | null>(null);
  readonly actual = this.estado.asReadonly();
  readonly nombre = computed(
    () => this.actual()?.nombreCompleto || this.actual()?.username || 'Usuario',
  );
  readonly iniciales = computed(() =>
    this.nombre()
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0))
      .join('')
      .toLocaleUpperCase('es'),
  );
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
    try {
      const guardado = sessionStorage.getItem(CLAVE);
      if (guardado) this.iniciar(JSON.parse(guardado));
    } catch {
      this.limpiar();
    }
  }

  iniciar(respuesta: unknown): void {
    if (!esLogin(respuesta)) throw new Error('La respuesta de inicio de sesión no es válida.');
    const partes = respuesta.token.split('.');
    if (partes.length !== 3) throw new Error('El token recibido no es válido.');
    let expiraEn: number;
    try {
      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const contenido: unknown = JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (caracter) =>
            caracter.charCodeAt(0),
          ),
        ),
      );
      if (
        !contenido ||
        typeof contenido !== 'object' ||
        !('exp' in contenido) ||
        typeof contenido.exp !== 'number' ||
        !Number.isFinite(contenido.exp) ||
        'purpose' in contenido ||
        !('sub' in contenido) ||
        contenido.sub !== respuesta.username
      )
        throw new Error();
      expiraEn = contenido.exp * 1000;
      if (!Number.isSafeInteger(expiraEn) || expiraEn <= Date.now()) throw new Error();
    } catch {
      throw new Error('El token recibido es inválido o ya expiró.');
    }
    // Only decode expiration for UX; token validity and permissions are enforced by the backend.
    const { id, idUsuario, ...datos } = respuesta;
    const sesion: Sesion = { ...datos, idUsuario: (id ?? idUsuario)!, expiraEn };
    this.estado.set(sesion);
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
    } catch {
      /* Keep an in-memory session when storage is unavailable. */
    }
    this.programarExpiracion();
  }

  token(): string | null {
    const sesion = this.actual();
    if (!sesion) return null;
    if (sesion.expiraEn <= Date.now()) {
      this.limpiar();
      return null;
    }
    return sesion.token;
  }

  limpiar(): void {
    clearTimeout(this.temporizador);
    this.estado.set(null);
    try {
      sessionStorage.removeItem(CLAVE);
    } catch {
      /* Storage may be unavailable. */
    }
  }

  private programarExpiracion(): void {
    clearTimeout(this.temporizador);
    const sesion = this.actual();
    if (!sesion) return;
    this.temporizador = setTimeout(
      () => {
        if (sesion.expiraEn > Date.now()) {
          this.programarExpiracion();
          return;
        }
        const returnUrl = retornoSeguro(this.router.url);
        this.limpiar();
        void this.router.navigate(['/login'], { queryParams: { expirada: '1', returnUrl } });
      },
      Math.min(sesion.expiraEn - Date.now(), 2147483647),
    );
  }
}
