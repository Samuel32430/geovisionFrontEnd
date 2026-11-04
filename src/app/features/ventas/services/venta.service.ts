import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { Montura } from '../../atencion-paciente-consulta/models/lente.model';
import {
  ConsultaHistorialVentas,
  PaginaVentaHistorial,
  VentaRegistroRequest,
  VentaResponse,
} from '../models/venta.model';

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/ventas`;
  private readonly urlCatalogos = `${environment.apiUrl}/catalogos-opticos`;

  registrar(request: VentaRegistroRequest) {
    return this.http.post<VentaResponse>(this.url, request).pipe(timeout(20000));
  }

  obtener(id: number) {
    return this.http.get<VentaResponse>(`${this.url}/${id}`).pipe(timeout(15000));
  }

  historial(consulta: ConsultaHistorialVentas) {
    let params = new HttpParams()
      .set('page', consulta.page)
      .set('size', consulta.size);

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
      .get<PaginaVentaHistorial>(`${this.url}/historial`, { params })
      .pipe(timeout(15000));
  }

  detalleHistorial(idVenta: number) {
    return this.http
      .get<VentaResponse>(`${this.url}/historial/${idVenta}/detalle`)
      .pipe(timeout(15000));
  }

  monturasDisponibles(page = 0, size = 10) {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<PaginaResponse<Montura>>(`${this.urlCatalogos}/monturas`, { params })
      .pipe(timeout(15000));
  }
}
