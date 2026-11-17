import { ConIdApi, normalizarId } from '../../../core/models/id-api';
import { PagoPendienteItem } from '../models/pago-pendiente.model';
import { PagoResponse, VentaResponse } from '../models/venta.model';

export type PagoApi =
  | PagoResponse
  | (Omit<PagoResponse, 'idPago' | 'fechaPago'> & { id: number; fechaRegistro: string });

export function pago(dto: PagoApi): PagoResponse {
  if ('id' in dto) {
    const { id, fechaRegistro, ...datos } = dto;
    return { ...datos, idPago: id, fechaPago: fechaRegistro };
  }
  return dto;
}

type VentaDatos = Omit<VentaResponse, 'pagos'> & { pagos: PagoApi[] };
export type VentaApi = ConIdApi<VentaDatos, 'idVenta'>;
export const venta = (dto: VentaApi): VentaResponse => ({
  ...normalizarId<VentaDatos, 'idVenta'>(dto, 'idVenta'),
  pagos: dto.pagos.map(pago),
});

type PendienteDatos = Omit<PagoPendienteItem, 'historialPagos'> & { historialPagos: PagoApi[] };
export type PendienteApi = ConIdApi<PendienteDatos, 'idVenta'>;
export const pendiente = (dto: PendienteApi): PagoPendienteItem => ({
  ...normalizarId<PendienteDatos, 'idVenta'>(dto, 'idVenta'),
  historialPagos: dto.historialPagos.map(pago),
});
