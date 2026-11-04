import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PagoResponse } from '../models/venta.model';
import { PagoPendienteItem, PagoPendienteRequest } from '../models/pago-pendiente.model';

@Injectable({ providedIn: 'root' })
export class PagoPendienteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/ventas/pagos-pendientes`;

  listar(termino?: string) {
    let params = new HttpParams();
    if (termino && termino.trim()) {
      params = params.set('termino', termino.trim());
    }
    return this.http.get<PagoPendienteItem[]>(this.url, { params }).pipe(timeout(15000));
  }

  obtenerPorVenta(idVenta: number) {
    return this.http.get<PagoPendienteItem>(`${this.url}/${idVenta}`).pipe(timeout(15000));
  }

  registrarPago(request: PagoPendienteRequest) {
    return this.http.post<PagoResponse>(this.url, request).pipe(timeout(15000));
  }
}
