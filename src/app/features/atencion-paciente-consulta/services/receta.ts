import { LenteRequest } from '../models/lente.model';
import { ExamenRequest } from '../models/examen-form';
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { RecetaResumen, RecetaDetalle, MedidaDetalle } from '../models/receta.model';

import { ConIdApi, normalizarId } from '../../../core/models/id-api';

type ResumenApi = ConIdApi<RecetaResumen, 'idReceta'>;
type MedidaApi = ConIdApi<MedidaDetalle, 'idMedida'>;
type Lente = RecetaDetalle['lentes'][number];
type LenteApi = ConIdApi<Lente, 'idLente'>;
type DetalleApi = ResumenApi & { medidas: MedidaApi[]; lentes: LenteApi[] };

const lente = (dto: LenteApi) => normalizarId<Lente, 'idLente'>(dto, 'idLente');
const detalle = (dto: DetalleApi): RecetaDetalle => ({
  ...normalizarId<RecetaResumen, 'idReceta'>(dto, 'idReceta'),
  medidas: dto.medidas.map((medida) => normalizarId<MedidaDetalle, 'idMedida'>(medida, 'idMedida')),
  lentes: dto.lentes.map(lente),
});
const paginaRecetas = (pagina: PaginaResponse<ResumenApi>) => ({
  ...pagina,
  content: pagina.content.map((dto) => normalizarId<RecetaResumen, 'idReceta'>(dto, 'idReceta')),
});

@Injectable({ providedIn: 'root' })
export class RecetaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/recetas`;

  historial(idPaciente: number, page = 0) {
    return this.http
      .get<PaginaResponse<ResumenApi>>(this.url + '/paciente/' + idPaciente + '/historial', {
        params: new HttpParams().set('page', page).set('size', 10),
      })
      .pipe(timeout(15000), map(paginaRecetas));
  }
  obtener(id: number) {
    return this.http.get<DetalleApi>(this.url + '/' + id).pipe(timeout(15000), map(detalle));
  }
  pdf(id: number) {
    return this.http
      .get(this.url + '/' + id + '/pdf', { responseType: 'blob' })
      .pipe(timeout(30000));
  }
  registrarExamen(request: ExamenRequest) {
    return this.http.post<DetalleApi>(this.url + '/examen-visual', request).pipe(map(detalle));
  }
  registrarExterna(request: ExamenRequest) {
    return this.http.post<DetalleApi>(this.url + '/externa', request).pipe(map(detalle));
  }
  configurarLente(id: number, request: LenteRequest) {
    return this.http.post<LenteApi>(this.url + '/' + id + '/lentes', request).pipe(map(lente));
  }
  recientes(idPaciente: number) {
    const params = new HttpParams().set('page', 0).set('size', 3);
    return this.http
      .get<PaginaResponse<ResumenApi>>(`${this.url}/paciente/${idPaciente}/historial`, {
        params,
      })
      .pipe(timeout(15000), map(paginaRecetas));
  }
}
