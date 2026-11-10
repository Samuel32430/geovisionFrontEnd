import { PaginaResponse } from '../../../core/models/pagina-response';

export type TipoComprobante = 'BOLETA' | 'FACTURA' | 'NOTA_VENTA';

export type MetodoPago =
  | 'EFECTIVO'
  | 'TARJETA_DEBITO'
  | 'TARJETA_CREDITO'
  | 'TRANSFERENCIA'
  | 'QR_YAPE_PLIN';

export type EstadoVenta = 'PENDIENTE' | 'PAGADA' | 'ANULADA';

export interface ProductoVendidoRequest {
  idProducto: number;
  codigoProducto?: string;
  nombreProducto?: string;
  cantidad: number;
  precioUnit: number;
  subTotal?: number;
}

export interface ProductoVendidoResponse extends ProductoVendidoRequest {
  idProductoVendido?: number;
  subTotal: number;
}

export interface ServicioVendidoRequest {
  idServicio: number;
  nombreServicio?: string;
  precio: number;
}

export interface ServicioVendidoResponse extends ServicioVendidoRequest {
  idServicioVendido?: number;
}

export interface PagoRegistroRequest {
  idVenta?: number;
  monto: number;
  metodoPago: MetodoPago;
  numeroOperacion?: string | null;
}

export interface PagoResponse {
  idPago: number;
  fechaPago: string;
  monto: number;
  metodoPago: MetodoPago;
  metodoPagoDescripcion: string;
  numeroOperacion: string | null;
}

export interface VentaRegistroRequest {
  idEmpleado?: number | null;
  idPaciente?: number | null;
  idReceta?: number | null;
  tipoComprobante: TipoComprobante;
  numeroComprobante?: string | null;
  fechaEntregaEstimada?: string | null;
  productos?: ProductoVendidoRequest[];
  servicios?: ServicioVendidoRequest[];
  pagos: PagoRegistroRequest[];
  total: number;
}

export interface VentaResponse {
  idVenta: number;
  fechaRegistro: string;
  total: number;
  totalPagado: number;
  saldoPendiente: number;
  estado: EstadoVenta;
  estadoDescripcion: string;
  tipoComprobante: TipoComprobante;
  tipoComprobanteDescripcion: string;
  numeroComprobante: string;
  idEmpleado: number;
  nombreCompletoEmpleado: string;
  idPaciente: number | null;
  nombreCompletoPaciente: string | null;
  idReceta: number | null;
  productos: ProductoVendidoResponse[];
  servicios: ServicioVendidoResponse[];
  pagos: PagoResponse[];
}

export interface VentaHistorialItem {
  idVenta: number;
  fechaRegistro: string;
  numeroComprobante: string;
  tipoComprobante: TipoComprobante;
  tipoComprobanteDescripcion: string;
  clienteNombre: string;
  clienteDocumento: string;
  vendedorNombre: string;
  total: number;
  totalPagado: number;
  saldoPendiente: number;
  estado: EstadoVenta;
  estadoDescripcion: string;
  tieneReceta: boolean;
  cantidadItems: number;
}

export type PaginaVentaHistorial = PaginaResponse<VentaHistorialItem>;

export interface ConsultaHistorialVentas {
  termino?: string;
  estado?: number | null; // 1: PENDIENTE, 2: PAGADA, 3: ANULADA
  fechaInicio?: string | null;
  fechaFin?: string | null;
  page: number;
  size: number;
}

export interface MercadoPagoQrRequest {
  idVenta?: number | null;
  monto: number;
  descripcion?: string;
}

export interface MercadoPagoQrResponse {
  qrData: string;
  inStoreOrderId?: string;
  externalReference: string;
  monto: number;
  estado: string;
  qrImageUrl?: string;
}

export const ETIQUETAS_METODO_PAGO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA_DEBITO: 'Tarjeta de Débito',
  TARJETA_CREDITO: 'Tarjeta de Crédito',
  TRANSFERENCIA: 'Transferencia Bancaria',
  QR_YAPE_PLIN: 'Billetera Digital / QR (Yape / Plin)',
};

export const ETIQUETAS_TIPO_COMPROBANTE: Record<TipoComprobante, string> = {
  BOLETA: 'Boleta de Venta',
  FACTURA: 'Factura Electrónica',
  NOTA_VENTA: 'Nota de Venta',
};

export const ETIQUETAS_ESTADO_VENTA: Record<EstadoVenta, string> = {
  PAGADA: 'Pagada Totalmente',
  PENDIENTE: 'Pago Pendiente / Con Saldo',
  ANULADA: 'Anulada',
};

export function requiereVoucher(metodo: MetodoPago): boolean {
  return (
    metodo === 'TARJETA_DEBITO' || metodo === 'TARJETA_CREDITO' || metodo === 'TRANSFERENCIA'
  );
}
