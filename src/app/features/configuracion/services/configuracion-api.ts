import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, of, throwError, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ConfiguracionEmpresa } from '../models/configuracion.model';

@Injectable({ providedIn: 'root' })
export class ConfiguracionApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/configuracion/empresa`;

  obtener(): Observable<ConfiguracionEmpresa | null> {
    return this.http.get<ConfiguracionEmpresa>(this.url).pipe(
      timeout(15000),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(null);
        }
        return throwError(() => error);
      }),
    );
  }

  registrar(datos: ConfiguracionEmpresa): Observable<ConfiguracionEmpresa> {
    return this.http.post<ConfiguracionEmpresa>(this.url, datos).pipe(timeout(15000));
  }

  actualizar(datos: ConfiguracionEmpresa): Observable<ConfiguracionEmpresa> {
    return this.http.put<ConfiguracionEmpresa>(this.url, datos).pipe(timeout(15000));
  }
}
