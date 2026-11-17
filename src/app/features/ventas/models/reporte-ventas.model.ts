export interface FiltroReporteVentas {
  fechaInicio?: string;
  fechaFin?: string;
  idEmpleado?: number;
  tipoComprobante?: 'BOLETA' | 'FACTURA' | 'NOTA_VENTA';
  estado?: 'PENDIENTE' | 'PAGADA' | 'ANULADA';
}

export interface KpiCard {
  titulo: string;
  valor: string;
  subtitulo: string;
}

export interface ItemVentaReporte {
  idVenta: number;
  fechaRegistro: string;
  numeroComprobante: string;
  tipoComprobante: string;
  estado: string;
  total: number;
  totalPagado: number;
  saldoPendiente: number;
  condicionPago: string;
  docCliente: string | null;
  nombreCliente: string | null;
  nombreVendedor: string;
  cantidadItems: number;
}

export interface ReporteVentasPeriodo {
  kpis: KpiCard[];
  totalVendido: number;
  totalCobrado: number;
  totalSaldoPendiente: number;
  totalVentas: number;
  ticketPromedio: number;
  totalPorMetodoPago: Record<string, number>;
  ventas: ItemVentaReporte[];
}

export interface ItemRankingComercial {
  ranking: number;
  tipoItem: 'PRODUCTO' | 'SERVICIO';
  idItem: number;
  codigo: string;
  nombre: string;
  categoria: string;
  precioUnitario: number;
  unidadesVendidas: number;
  totalRecaudado: number;
}

export interface ReporteRankingComercial {
  kpis: KpiCard[];
  totalUnidadesVendidas: number;
  totalRecaudado: number;
  items: ItemRankingComercial[];
}

export interface ItemSaldoPendienteReporte {
  idVenta: number;
  numeroComprobante: string;
  fechaRegistro: string;
  clienteNombre: string;
  clienteDocumento: string;
  total: number;
  adelantoPagado: number;
  saldoPendiente: number;
  antiguedadDias: number;
}

export interface ReporteSaldosPendientes {
  kpis: KpiCard[];
  totalCarteraPendiente: number;
  totalAdelantosRecibidos: number;
  totalCuentasPendientes: number;
  cuentas: ItemSaldoPendienteReporte[];
}
