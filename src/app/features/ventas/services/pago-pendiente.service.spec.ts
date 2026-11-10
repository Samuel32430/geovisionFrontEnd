import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { PagoPendienteService } from './pago-pendiente.service';
import { PagoPendienteRequest } from '../models/pago-pendiente.model';

describe('PagoPendienteService', () => {
  let service: PagoPendienteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PagoPendienteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('debe listar ventas con saldo pendiente con o sin termino', () => {
    service.listar('Laura').subscribe((res) => {
      expect(res.length).toBe(1);
    });

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/ventas/pagos-pendientes`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('termino')).toBe('Laura');
    req.flush([{ id: 1, historialPagos: [], totalVenta: 500, saldoPendiente: 250 }]);
  });

  it('debe consultar saldo pendiente de una venta especifica', () => {
    service.obtenerPorVenta(3).subscribe((res) => {
      expect(res.idVenta).toBe(3);
    });

    const req = http.expectOne(`${environment.apiUrl}/ventas/pagos-pendientes/3`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 3, historialPagos: [], saldoPendiente: 150 });
  });

  it('debe registrar un abono o saldo liquidado', () => {
    const payload: PagoPendienteRequest = {
      idVenta: 3,
      monto: 150,
      metodoPago: 'EFECTIVO',
    };

    service.registrarPago(payload).subscribe((res) => {
      expect(res.idPago).toBe(99);
      expect(res.fechaPago).toBe('2026-11-10T10:00:00');
      expect(res.monto).toBe(150);
    });

    const req = http.expectOne(`${environment.apiUrl}/ventas/pagos-pendientes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 99, fechaRegistro: '2026-11-10T10:00:00', monto: 150, metodoPago: 'EFECTIVO' });
  });
});
