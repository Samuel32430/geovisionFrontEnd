import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { InventarioService } from './inventario.service';
import { AjusteStockRequest, EntradaStockRequest } from '../models/inventario.model';

describe('InventarioService', () => {
  let service: InventarioService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InventarioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe consultar productos con parámetros de búsqueda', () => {
    service.listarProductos({ termino: 'RAY', page: 0, size: 10 }).subscribe((res) => {
      expect(res.content.length).toBe(1);
      expect(res.content[0].codigo).toBe('MONT-RAY-01');
    });

    const req = http.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/productos` &&
        r.params.get('termino') === 'RAY' &&
        r.params.get('page') === '0'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [
        {
          idProducto: 1,
          codigo: 'MONT-RAY-01',
          nombre: 'Montura RayBan Aviator',
          marca: 'Ray-Ban',
          precio: 350,
          stock: 12,
          estado: 1,
        },
      ],
      number: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
      empty: false,
    });
  });

  it('debe registrar una entrada de stock enviando POST a /inventario/entradas', () => {
    const payload: EntradaStockRequest = {
      idProducto: 1,
      cantidad: 10,
      motivo: 1,
      observaciones: 'Compra de lote',
    };

    service.registrarEntrada(payload).subscribe((res) => {
      expect(res.cantidad).toBe(10);
      expect(res.stockPosterior).toBe(22);
    });

    const req = http.expectOne(`${environment.apiUrl}/inventario/entradas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      idMovimiento: 50,
      idProducto: 1,
      codigoProducto: 'MONT-RAY-01',
      nombreProducto: 'Montura RayBan Aviator',
      cantidad: 10,
      stockPrevio: 12,
      stockPosterior: 22,
      motivo: 1,
      motivoDescripcion: 'Compra a proveedor',
      nombreUsuario: 'admin',
      fechaRegistro: '2026-11-09T19:00:00',
    });
  });

  it('debe registrar un ajuste de stock enviando POST a /inventario/ajustes', () => {
    const payload: AjusteStockRequest = {
      idProducto: 1,
      cantidad: 2,
      tipoAjuste: 'DECREMENTO',
      motivo: 2,
      observaciones: 'Luna rota en exhibición',
    };

    service.registrarAjuste(payload).subscribe((res) => {
      expect(res.cantidad).toBe(2);
      expect(res.stockPosterior).toBe(20);
    });

    const req = http.expectOne(`${environment.apiUrl}/inventario/ajustes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      idMovimiento: 51,
      idProducto: 1,
      codigoProducto: 'MONT-RAY-01',
      nombreProducto: 'Montura RayBan Aviator',
      cantidad: 2,
      stockPrevio: 22,
      stockPosterior: 20,
      motivo: 2,
      motivoDescripcion: 'Daño o rotura',
      nombreUsuario: 'admin',
      fechaRegistro: '2026-11-09T19:05:00',
    });
  });

  it('debe consultar alertas de bajo stock', () => {
    service.listarAlertasBajoStock(5).subscribe((alertas) => {
      expect(alertas.length).toBe(1);
      expect(alertas[0].stock).toBe(3);
    });

    const req = http.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/inventario/alertas/bajo-stock` &&
        r.params.get('umbral') === '5'
    );
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        idProducto: 2,
        codigo: 'MONT-OAK-01',
        nombre: 'Montura Oakley Holbrook',
        marca: 'Oakley',
        precio: 420,
        stock: 3,
        estado: 1,
      },
    ]);
  });
});
