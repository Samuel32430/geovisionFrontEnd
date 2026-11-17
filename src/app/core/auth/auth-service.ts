import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, of, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponseApi,
  MensajeRespuesta,
  RecuperarPasswordRequest,
  ResetPasswordRequest,
  ValidarTokenRespuesta,
} from './auth.model';
import { SesionService } from './sesion-service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionService);
  private readonly url = `${environment.apiUrl}/auth`;

  login(request: LoginRequest) {
    return this.http.post<LoginResponseApi>(`${this.url}/login`, request).pipe(
      timeout(15000),
      tap((respuesta) => this.sesion.iniciar(respuesta)),
    );
  }

  logout() {
    const token = this.sesion.token();
    return this.http.post<unknown>(`${this.url}/logout`, {}).pipe(
      timeout(10000),
      catchError(() => of(null)),
      tap(() => {
        if ((this.sesion.actual()?.token ?? null) === token) this.sesion.limpiar();
      }),
      map(() => undefined),
    );
  }

  solicitarRecuperacionPassword(correo: string) {
    const payload: RecuperarPasswordRequest = { correo: correo.trim() };
    return this.http
      .post<MensajeRespuesta>(`${this.url}/recuperar-password`, payload)
      .pipe(timeout(15000));
  }

  validarTokenRecuperacion(token: string) {
    const params = new HttpParams().set('token', token.trim());
    return this.http
      .get<ValidarTokenRespuesta>(`${this.url}/validar-token`, { params })
      .pipe(timeout(10000));
  }

  restablecerPassword(request: ResetPasswordRequest) {
    const payload: ResetPasswordRequest = {
      token: request.token.trim(),
      nuevoPassword: request.nuevoPassword,
      confirmarPassword: request.confirmarPassword,
    };
    return this.http
      .post<MensajeRespuesta>(`${this.url}/reset-password`, payload)
      .pipe(timeout(15000));
  }
}
