import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { pago, PagoApi, pendiente, PendienteApi } from './venta-api-mapeo';
import { PagoPendienteRequest } from '../models/pago-pendiente.model';

@Injectable({ providedIn: 'root' })
export class PagoPendienteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/ventas/pagos-pendientes`;

  listar(termino?: string) {
    let params = new HttpParams();
    if (termino && termino.trim()) {
      params = params.set('termino', termino.trim());
    }
    return this.http.get<PendienteApi[]>(this.url, { params }).pipe(
      timeout(15000),
      map((datos) => datos.map(pendiente)),
    );
  }

  obtenerPorVenta(idVenta: number) {
    return this.http
      .get<PendienteApi>(`${this.url}/${idVenta}`)
      .pipe(timeout(15000), map(pendiente));
  }

  registrarPago(request: PagoPendienteRequest) {
    return this.http.post<PagoApi>(this.url, request).pipe(timeout(15000), map(pago));
  }
}
