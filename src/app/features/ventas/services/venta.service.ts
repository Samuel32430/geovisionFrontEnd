import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginaResponse } from '../../../core/models/pagina-response';
import {
  MonturaApi,
  paginaMonturas,
} from '../../atencion-paciente-consulta/services/catalogo-optico';
import { ConIdApi, normalizarId } from '../../../core/models/id-api';
import { VentaApi, venta } from './venta-api-mapeo';
import {
  ConsultaHistorialVentas,
  VentaHistorialItem,
  VentaRegistroRequest,
} from '../models/venta.model';

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/ventas`;
  private readonly urlCatalogos = `${environment.apiUrl}/catalogos-opticos`;

  registrar(request: VentaRegistroRequest) {
    return this.http.post<VentaApi>(this.url, request).pipe(timeout(20000), map(venta));
  }

  obtener(id: number) {
    return this.http.get<VentaApi>(`${this.url}/${id}`).pipe(timeout(15000), map(venta));
  }

  historial(consulta: ConsultaHistorialVentas) {
    let params = new HttpParams().set('page', consulta.page).set('size', consulta.size);

    if (consulta.termino && consulta.termino.trim()) {
      params = params.set('termino', consulta.termino.trim());
    }
    if (consulta.estado !== null && consulta.estado !== undefined && consulta.estado > 0) {
      params = params.set('estado', consulta.estado);
    }
    if (consulta.fechaInicio) {
      params = params.set('fechaInicio', consulta.fechaInicio);
    }
    if (consulta.fechaFin) {
      params = params.set('fechaFin', consulta.fechaFin);
    }

    return this.http
      .get<PaginaResponse<ConIdApi<VentaHistorialItem, 'idVenta'>>>(`${this.url}/historial`, {
        params,
      })
      .pipe(
        timeout(15000),
        map((pagina) => ({
          ...pagina,
          content: pagina.content.map((dto) =>
            normalizarId<VentaHistorialItem, 'idVenta'>(dto, 'idVenta'),
          ),
        })),
      );
  }

  detalleHistorial(idVenta: number) {
    return this.http
      .get<VentaApi>(`${this.url}/historial/${idVenta}/detalle`)
      .pipe(timeout(15000), map(venta));
  }

  monturasDisponibles(page = 0, size = 10) {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<PaginaResponse<MonturaApi>>(`${this.urlCatalogos}/monturas`, { params })
      .pipe(timeout(15000), map(paginaMonturas));
  }
}
