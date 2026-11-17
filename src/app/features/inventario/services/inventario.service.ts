import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AjusteStockRequest,
  EntradaStockRequest,
  MovimientoStockResponse,
  normalizarProductoItem,
  PaginaMovimientos,
  PaginaProductos,
  ProductoItem,
  ProductoRequest,
  ProductoStock,
} from '../models/inventario.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly urlInventario = `${environment.apiUrl}/inventario`;
  private readonly urlProductos = `${environment.apiUrl}/productos`;

  listarProductos(filtros: {
    termino?: string;
    idCategoria?: number | null;
    estado?: number | null;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  }): Observable<PaginaProductos> {
    let params = new HttpParams()
      .set('page', (filtros.page ?? 0).toString())
      .set('size', (filtros.size ?? 10).toString())
      .set('sortBy', filtros.sortBy ?? 'nombre')
      .set('sortDir', filtros.sortDir ?? 'ASC');

    if (filtros.termino && filtros.termino.trim() !== '') {
      params = params.set('termino', filtros.termino.trim());
    }
    if (filtros.idCategoria != null) {
      params = params.set('idCategoria', filtros.idCategoria.toString());
    }
    if (filtros.estado != null) {
      params = params.set('estado', filtros.estado.toString());
    }

    return this.http.get<PaginaProductos>(this.urlProductos, { params }).pipe(
      timeout(15000),
      map((res) => ({
        ...res,
        content: (res.content || []).map(normalizarProductoItem),
      }))
    );
  }

  obtenerProductoPorId(id: number): Observable<ProductoItem> {
    const idValido = Number(id);
    return this.http.get<ProductoItem>(`${this.urlProductos}/${idValido}`).pipe(
      timeout(10000),
      map(normalizarProductoItem)
    );
  }

  consultarStockActual(idProducto: number, umbral = 5): Observable<ProductoStock> {
    const idValido = Number(idProducto);
    const params = new HttpParams().set('umbralStockMinimo', umbral.toString());
    return this.http
      .get<ProductoStock>(`${this.urlInventario}/stock/${idValido}`, { params })
      .pipe(timeout(10000));
  }

  listarAlertasBajoStock(umbral = 5): Observable<ProductoItem[]> {
    const params = new HttpParams().set('umbral', umbral.toString());
    return this.http
      .get<ProductoItem[]>(`${this.urlInventario}/alertas/bajo-stock`, { params })
      .pipe(
        timeout(15000),
        map((lista) => (lista || []).map(normalizarProductoItem))
      );
  }

  registrarEntrada(request: EntradaStockRequest): Observable<MovimientoStockResponse> {
    const payload = {
      ...request,
      idProducto: Number(request.idProducto),
    };
    return this.http
      .post<MovimientoStockResponse>(`${this.urlInventario}/entradas`, payload)
      .pipe(timeout(15000));
  }

  registrarAjuste(request: AjusteStockRequest): Observable<MovimientoStockResponse> {
    const payload = {
      ...request,
      idProducto: Number(request.idProducto),
    };
    return this.http
      .post<MovimientoStockResponse>(`${this.urlInventario}/ajustes`, payload)
      .pipe(timeout(15000));
  }

  listarMovimientosKardex(
    idProducto: number,
    page = 0,
    size = 10
  ): Observable<PaginaMovimientos> {
    const idValido = Number(idProducto);
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http
      .get<PaginaMovimientos>(`${this.urlInventario}/movimientos/${idValido}`, { params })
      .pipe(timeout(15000));
  }

  cambiarEstadoProducto(idProducto: number, nuevoEstado: number): Observable<ProductoItem> {
    const idValido = Number(idProducto);
    return this.http
      .patch<ProductoItem>(`${this.urlProductos}/${idValido}/estado?estado=${nuevoEstado}`, {})
      .pipe(
        timeout(10000),
        map(normalizarProductoItem)
      );
  }

  registrarProducto(request: ProductoRequest): Observable<ProductoItem> {
    return this.http.post<ProductoItem>(this.urlProductos, request).pipe(
      timeout(15000),
      map(normalizarProductoItem)
    );
  }

  actualizarProducto(id: number, request: ProductoRequest): Observable<ProductoItem> {
    const idValido = Number(id);
    return this.http.put<ProductoItem>(`${this.urlProductos}/${idValido}`, request).pipe(
      timeout(15000),
      map(normalizarProductoItem)
    );
  }
}
