import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  FiltroReporteVentas,
  ReporteRankingComercial,
  ReporteVentasPeriodo,
} from '../models/reporte-ventas.model';
import { PagoPendienteItem } from '../models/pago-pendiente.model';

import { pendiente, PendienteApi } from './venta-api-mapeo';

@Injectable({ providedIn: 'root' })
export class ReporteVentasService {
  private readonly http = inject(HttpClient);
  private readonly urlReportes = `${environment.apiUrl}/reportes/ventas`;
  private readonly urlPagosPendientes = `${environment.apiUrl}/ventas/pagos-pendientes`;

  private construirParams(filtro: FiltroReporteVentas): HttpParams {
    let params = new HttpParams();
    if (filtro.fechaInicio) params = params.set('fechaInicio', filtro.fechaInicio);
    if (filtro.fechaFin) params = params.set('fechaFin', filtro.fechaFin);
    if (filtro.idEmpleado) params = params.set('idEmpleado', filtro.idEmpleado.toString());
    if (filtro.tipoComprobante) params = params.set('tipoComprobante', filtro.tipoComprobante);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    return params;
  }

  obtenerReportePeriodo(filtro: FiltroReporteVentas): Observable<ReporteVentasPeriodo> {
    const params = this.construirParams(filtro);
    return this.http.get<ReporteVentasPeriodo>(`${this.urlReportes}/periodo`, { params });
  }

  descargarReportePeriodoPdf(filtro: FiltroReporteVentas): Observable<Blob> {
    const params = this.construirParams(filtro);
    return this.http.get(`${this.urlReportes}/periodo/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  obtenerRankingComercial(filtro: FiltroReporteVentas): Observable<ReporteRankingComercial> {
    const params = this.construirParams(filtro);
    return this.http.get<ReporteRankingComercial>(`${this.urlReportes}/ranking-comercial`, {
      params,
    });
  }

  descargarRankingComercialPdf(filtro: FiltroReporteVentas): Observable<Blob> {
    const params = this.construirParams(filtro);
    return this.http.get(`${this.urlReportes}/ranking-comercial/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  obtenerSaldosPendientes(termino?: string): Observable<PagoPendienteItem[]> {
    let params = new HttpParams();
    if (termino && termino.trim()) {
      params = params.set('termino', termino.trim());
    }
    return this.http
      .get<PendienteApi[]>(this.urlPagosPendientes, { params })
      .pipe(map((datos) => datos.map(pendiente)));
  }

  abrirPdfEnPestana(blob: Blob): void {
    const blobUrl = window.URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  }

  descargarBlob(blob: Blob, nombreArchivo: string): void {
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(link.href);
  }
}
