import { PaginaResponse } from '../../../core/models/pagina-response';

export interface MonturaDetalle {
  idMontura?: number;
  tipoMontura?: string;
  material?: string;
  color?: string;
  calibre?: number;
  puente?: number;
  varilla?: number;
  forma?: string;
  genero?: string;
}

export interface ProductoItem {
  id?: number;
  idProducto: number;
  codigo: string;
  nombre: string;
  marca: string;
  descripcion?: string;
  precio: number;
  stock: number;
  estado: number;
  estadoDescripcion?: string;
  fechaRegistro?: string;
  idCategoria?: number;
  nombreCategoria?: string;
  esMontura?: boolean;
  montura?: MonturaDetalle;
}

export function normalizarProductoItem(dto: any): ProductoItem {
  const idReal = Number(dto?.idProducto ?? dto?.id ?? dto?.id_producto ?? 0);
  return {
    ...dto,
    id: idReal,
    idProducto: idReal,
  };
}

export interface ProductoStock {
  idProducto: number;
  codigo: string;
  nombre: string;
  marca?: string;
  stockActual: number;
  precio: number;
  estado: number;
  bajoStock: boolean;
  umbralAplicado: number;
}

export interface EntradaStockRequest {
  idProducto: number;
  cantidad: number;
  motivo?: number;
  observaciones?: string;
}

export interface AjusteStockRequest {
  idProducto: number;
  cantidad: number;
  tipoAjuste: 'INCREMENTO' | 'DECREMENTO';
  motivo: number;
  observaciones: string;
}

export interface MovimientoStockResponse {
  idMovimiento: number;
  idProducto: number;
  codigoProducto: string;
  nombreProducto: string;
  cantidad: number;
  stockPrevio: number;
  stockPosterior: number;
  motivo: number;
  motivoDescripcion: string;
  observaciones?: string;
  nombreUsuario: string;
  fechaRegistro: string;
}

export interface ProductoRequest {
  codigo: string;
  nombre: string;
  marca: string;
  descripcion?: string;
  precio: number;
  stock?: number;
  stockInicial?: number;
  estado?: number;
  idCategoria?: number;
  montura?: MonturaDetalle;
}

export interface CategoriaCatalogo {
  idCategoria: number;
  nombre: string;
}

export type PaginaProductos = PaginaResponse<ProductoItem>;
export type PaginaMovimientos = PaginaResponse<MovimientoStockResponse>;
