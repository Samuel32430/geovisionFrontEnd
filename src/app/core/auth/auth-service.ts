import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from './auth.model';
import { SesionService } from './sesion-service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionService);
  private readonly url = `${environment.apiUrl}/auth`;

  login(request: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.url}/login`, request).pipe(
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
}
