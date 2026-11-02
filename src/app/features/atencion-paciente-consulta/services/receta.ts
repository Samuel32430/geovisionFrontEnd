import { LenteRequest } from '../models/lente.model';
import { ExamenRequest } from '../models/examen-form';
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { RecetaResumen, RecetaDetalle } from '../models/receta.model';

@Injectable({ providedIn: 'root' })
export class RecetaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/recetas`;

  historial(idPaciente: number, page = 0) {
    return this.http
      .get<PaginaResponse<RecetaResumen>>(this.url + '/paciente/' + idPaciente + '/historial', {
        params: new HttpParams().set('page', page).set('size', 10),
      })
      .pipe(timeout(15000));
  }
  obtener(id: number) {
    return this.http.get<RecetaDetalle>(this.url + '/' + id).pipe(timeout(15000));
  }
  pdf(id: number) {
    return this.http
      .get(this.url + '/' + id + '/pdf', { responseType: 'blob' })
      .pipe(timeout(30000));
  }
  registrarExamen(request: ExamenRequest) {
    return this.http.post<RecetaDetalle>(this.url + '/examen-visual', request);
  }
  registrarExterna(request: ExamenRequest) {
    return this.http.post<RecetaDetalle>(this.url + '/externa', request);
  }
  configurarLente(id: number, request: LenteRequest) {
    return this.http.post<RecetaDetalle['lentes'][number]>(
      this.url + '/' + id + '/lentes',
      request,
    );
  }
  recientes(idPaciente: number) {
    const params = new HttpParams().set('page', 0).set('size', 3);
    return this.http
      .get<PaginaResponse<RecetaResumen>>(`${this.url}/paciente/${idPaciente}/historial`, {
        params,
      })
      .pipe(timeout(15000));
  }
}
