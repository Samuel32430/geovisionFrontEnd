import type { MedidaDetalle, MedidaOjo } from '../../atencion-paciente-consulta/models/receta.model';

export const ESTADOS = {
  PENDIENTE: 'Pendiente de envío',
  ENVIADO_LABORATORIO: 'En laboratorio',
  RECIBIDO_LABORATORIO: 'Pendiente de calidad',
  CONTROL_CALIDAD_APROBADO: 'Calidad aprobada',
  CONTROL_CALIDAD_RECHAZADO: 'Retrasado',
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
