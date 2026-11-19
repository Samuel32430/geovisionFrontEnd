import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import type { PaginaResponse } from '../../../core/models/pagina-response';
import type {
  EnvioOrden,
  EstadoOrden,
  Lensometria,
  OrdenTrabajo,
  PendienteOrden,
  PoliticaCalidad,
} from '../models/orden-trabajo.model';

@Injectable({ providedIn: 'root' })
export class OrdenApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/ordenes-trabajo';
  private readonly calidad = environment.apiUrl + '/control-calidad';

  pendientes(page: number, size: number, termino: string) {
    return this.http.get<PaginaResponse<PendienteOrden>>(this.url + '/ventas-pendientes', {
      params: this.parametros(page, size, termino),
    });
  }

  listar(page: number, size: number, termino: string, estado: EstadoOrden | '') {
    const params = this.parametros(page, size, termino);
    return this.http.get<PaginaResponse<OrdenTrabajo>>(this.url, {
      params: estado ? params.set('estado', estado) : params,
    });
  }

  obtener(id: number) {
    return this.http.get<OrdenTrabajo>(this.url + '/' + id);
  }

  limiteObservaciones(id: number) {
    return this.http.get<number>(this.url + '/' + id + '/limite-observaciones');
  }

  generar(idLente: number, descripcion: string) {
    return this.http.post<OrdenTrabajo>(this.url, { idLente, descripcion });
  }

  laboratorios() {
    return this.http.get<{ id: number; nombre: string }[]>(this.url + '/laboratorios');
  }

  enviar(idOrdenTrabajo: number, idLaboratorio: number, fecha: string, observaciones: string) {
    return this.http.post<EnvioOrden>(this.url + '/envios', {
      idOrdenTrabajo,
      idLaboratorio,
      fechaRecepcionEstimada: fecha || null,
      observaciones,
    });
  }

  recibir(id: number, observaciones: string) {
    return this.http.put<EnvioOrden>(this.url + '/envios/' + id + '/recepcion', { observaciones });
  }

  politica() {
    return this.http.get<PoliticaCalidad>(this.calidad + '/politica');
  }

  controlar(idEnvioLaboratorio: number, medidasLensometria: Lensometria[], observaciones: string) {
    return this.http.post<EnvioOrden>(this.calidad, {
      idEnvioLaboratorio,
      medidasLensometria,
      observaciones,
    });
  }

  whatsapp(id: number, telefono: string, confirmar = false) {
    const ruta = this.url + '/' + id + '/notificaciones/whatsapp';
    return this.http.post<{ enlaceWhatsApp: string | null }>(
      confirmar ? ruta + '/confirmar' : ruta,
      { telefono },
    );
  }

  sms(id: number, telefono: string) {
    return this.http.post<{ estado: 'ACEPTADO' | 'FALLIDO' | 'INCIERTO' }>(
      this.url + '/' + id + '/notificaciones/sms',
      { telefono },
    );
  }

  entregar(idOrdenTrabajo: number, observaciones: string) {
    return this.http.post<OrdenTrabajo>(this.url + '/entrega', { idOrdenTrabajo, observaciones });
  }

  private parametros(page: number, size: number, termino: string) {
    return new HttpParams({ fromObject: { page, size, termino } });
  }
}
