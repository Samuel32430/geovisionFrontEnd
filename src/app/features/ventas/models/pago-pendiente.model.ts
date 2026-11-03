import { EstadoVenta, MetodoPago, PagoResponse } from './venta.model';

export interface PagoPendienteItem {
  idVenta: number;
  numeroComprobante: string;
  fechaVenta: string;
  idPaciente: number | null;
  pacienteNombre: string;
  pacienteTelefono: string | null;
  pacienteDocumento: string | null;
  totalVenta: number;
  totalPagado: number;
  saldoPendiente: number;
  estado: EstadoVenta;
  historialPagos: PagoResponse[];
}

export interface PagoPendienteRequest {
  idVenta: number;
  monto: number;
  metodoPago: MetodoPago;
  numeroOperacion?: string | null;
}
