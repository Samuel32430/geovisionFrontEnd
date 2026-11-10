import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PaginaResponse } from '../../core/models/pagina-response';
import { MedidaDetalle, MedidaOjo } from '../atencion-paciente-consulta/models/receta.model';

export const ESTADOS = {
  PENDIENTE: 'Pendiente de envío',
  ENVIADO_LABORATORIO: 'En laboratorio',
  RECIBIDO_LABORATORIO: 'Pendiente de calidad',
  CONTROL_CALIDAD_APROBADO: 'Calidad aprobada',
  CONTROL_CALIDAD_RECHAZADO: 'Calidad rechazada',
  LISTO_ENTREGA: 'Listo para entrega',
  ENTREGADO: 'Entregado',
  ANULADO: 'Anulado',
};
export type EstadoOrden = keyof typeof ESTADOS;
export type MedidaOrden = Omit<MedidaDetalle, 'idMedida'>;
export type Lensometria = Pick<MedidaOrden, 'tipoMedida' | 'distanciaPupilar' | 'prisma'> & {
  ojoDerecho: Omit<MedidaOjo, 'agudezaVisual'>;
  ojoIzquierdo: Omit<MedidaOjo, 'agudezaVisual'>;
};

export interface PendienteOrden {
  idVenta: number;
  numeroComprobante: string | null;
  idLente: number;
  idReceta: number;
  nombrePaciente: string;
  totalVenta: number;
}

export interface EnvioOrden {
  id: number;
  nombreLaboratorio: string;
  fechaEnvio: string;
  fechaRecepcionEstimada: string | null;
  fechaRecepcion: string | null;
  fechaRevision: string | null;
  aprobado: boolean | null;
  observaciones: string | null;
  medidasControl: MedidaOrden[];
}

export interface OrdenTrabajo {
  id: number;
  idVenta: number | null;
  fechaRegistro: string;
  fechaEntrega: string | null;
  fechaNotificacion: string | null;
  saldoPendiente: number | null;
  estado: EstadoOrden;
  descripcion: string | null;
  nombrePaciente: string;
  telefonoPaciente: string | null;
  idPaciente: number;
  lente: {
    idReceta: number;
    nombreMaterialCristal: string | null;
    nombreMontura: string | null;
    tratamientos: { nombre: string }[];
    medidas: MedidaOrden[];
  };
  envios: EnvioOrden[];
}

export interface PoliticaCalidad {
  configurada: boolean;
  dioptrias: number | null;
  ejeGrados: number | null;
  distanciaPupilarMm: number | null;
  prisma: number | null;
}

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

  entregar(idOrdenTrabajo: number, observaciones: string) {
    return this.http.post<OrdenTrabajo>(this.url + '/entrega', { idOrdenTrabajo, observaciones });
  }

  private parametros(page: number, size: number, termino: string) {
    return new HttpParams({ fromObject: { page, size, termino } });
  }
}
