import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { VentaService } from './venta.service';
import { MercadoPagoQrRequest, MercadoPagoQrResponse, VentaRegistroRequest } from '../models/venta.model';

describe('VentaService', () => {
  let service: VentaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VentaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('debe registrar una venta enviando petición POST a /ventas', () => {
    const payload: VentaRegistroRequest = {
      tipoComprobante: 'BOLETA',
      total: 100,
      pagos: [{ monto: 100, metodoPago: 'EFECTIVO' }],
    };

    service.registrar(payload).subscribe((res) => {
      expect(res.idVenta).toBe(10);
      expect(res.total).toBe(100);
    });

    const req = http.expectOne(`${environment.apiUrl}/ventas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 10, pagos: [], total: 100, estado: 'PAGADA' });
  });

  it('debe consultar el historial de ventas con filtros de termino, estado y paginacion', () => {
    service.historial({ termino: 'Maria', estado: 1, page: 0, size: 10 }).subscribe((res) => {
      expect(res.totalElements).toBe(1);
    });

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/ventas/historial`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('termino')).toBe('Maria');
    expect(req.request.params.get('estado')).toBe('1');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ content: [{ id: 1 }], totalElements: 1, totalPages: 1 });
  });

  it('debe consultar el detalle de venta para el modal de historial', () => {
    service.detalleHistorial(5).subscribe((res) => {
      expect(res.idVenta).toBe(5);
    });

    const req = http.expectOne(`${environment.apiUrl}/ventas/historial/5/detalle`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 5, pagos: [], total: 250, saldoPendiente: 50 });
  });

  it('debe generar orden QR dinámico en Mercado Pago enviando petición POST a /ventas/pagos/qr', () => {
    const payload: MercadoPagoQrRequest = {
      monto: 150,
      descripcion: 'Venta #1',
    };
    const mockRespuesta: MercadoPagoQrResponse = {
      qrData: '00020126580014com.mercadolibre...',
      externalReference: 'REF-123',
      monto: 150,
      estado: 'CREADO',
      qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=00020126...',
    };

    service.generarOrdenQr(payload).subscribe((res) => {
      expect(res.qrData).toBe('00020126580014com.mercadolibre...');
      expect(res.qrImageUrl).toContain('https://');
      expect(res.monto).toBe(150);
    });

    const req = http.expectOne(`${environment.apiUrl}/ventas/pagos/qr`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockRespuesta);
  });
});
