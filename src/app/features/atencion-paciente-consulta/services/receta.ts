import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { RecetaResumen } from '../models/receta.model';

@Injectable({ providedIn: 'root' })
export class RecetaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/recetas`;

  recientes(idPaciente: number) {
    const params = new HttpParams().set('page', 0).set('size', 3);
    return this.http
      .get<PaginaResponse<RecetaResumen>>(`${this.url}/paciente/${idPaciente}/historial`, {
        params,
      })
      .pipe(timeout(15000));
  }
}
