import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PaginaResponse } from '../../../core/models/pagina-response';
import type { Catalogo, RegistroCatalogo } from '../models/mantenimiento.model';

@Injectable({ providedIn: 'root' })
export class MantenimientoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/mantenimiento`;

  listar(catalogo: Catalogo, termino: string, estado: string, page: number) {
    let params = new HttpParams().set('termino', termino.trim()).set('page', page).set('size', 10);
    if (estado !== '' && catalogo !== 'materiales-cristal' && catalogo !== 'tratamientos-cristal') {
      params = params.set('estado', estado);
    }
    return this.http
      .get<PaginaResponse<RegistroCatalogo>>(`${this.url}/${catalogo}`, { params })
      .pipe(timeout(15000));
  }

  guardar(catalogo: Catalogo, registro: RegistroCatalogo) {
    const url = `${this.url}/${catalogo}`;
    return (
      registro.id == null
        ? this.http.post<RegistroCatalogo>(url, registro)
        : this.http.put<RegistroCatalogo>(`${url}/${registro.id}`, registro)
    ).pipe(timeout(15000));
  }
}
