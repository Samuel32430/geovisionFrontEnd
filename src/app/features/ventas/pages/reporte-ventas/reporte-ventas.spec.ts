import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ReporteVentas } from './reporte-ventas';
import { ReporteRankingComercial, ReporteVentasPeriodo } from '../../models/reporte-ventas.model';
import { PagoPendienteItem } from '../../models/pago-pendiente.model';

describe('ReporteVentas', () => {
  let fixture: ComponentFixture<ReporteVentas>;
  let component: ReporteVentas;
  let http: HttpTestingController;

  const mockPeriodo: ReporteVentasPeriodo = {
    kpis: [
      { titulo: 'Total Facturado', valor: 'S/ 1,500.00', subtitulo: 'Bruto' },
      { titulo: 'Recaudado', valor: 'S/ 1,000.00', subtitulo: 'Caja' },
    ],
    totalVendido: 1500,
    totalCobrado: 1000,
    totalSaldoPendiente: 500,
    totalVentas: 3,
    ticketPromedio: 500,
    totalPorMetodoPago: {
      EFECTIVO: 600,
      TARJETA: 400,
    },
    ventas: [
      {
        idVenta: 1,
        fechaRegistro: '2026-11-01T10:00:00',
        numeroComprobante: 'B001-00000001',
        tipoComprobante: 'BOLETA',
        estado: 'PAGADA',
        total: 500,
        totalPagado: 500,
        saldoPendiente: 0,
        condicionPago: 'CONTADO',
        docCliente: '12345678',
        nombreCliente: 'Juan Perez',
        nombreVendedor: 'Vendedor Demo',
        cantidadItems: 2,
      },
    ],
  };

  const mockRanking: ReporteRankingComercial = {
    kpis: [],
    totalUnidadesVendidas: 10,
    totalRecaudado: 2500,
    items: [
      {
        ranking: 1,
        tipoItem: 'PRODUCTO',
        idItem: 101,
        codigo: 'PROD-01',
        nombre: 'Montura Titanium',
        categoria: 'Monturas',
        precioUnitario: 250,
        unidadesVendidas: 10,
        totalRecaudado: 2500,
      },
    ],
  };

  const mockSaldos: PagoPendienteItem[] = [
    {
      idVenta: 2,
      numeroComprobante: 'B001-00000002',
      fechaVenta: '2026-11-02T11:00:00',
      idPaciente: 5,
      pacienteNombre: 'Maria Lopez',
      pacienteTelefono: '999888777',
      pacienteDocumento: '87654321',
      totalVenta: 1000,
      totalPagado: 400,
      saldoPendiente: 600,
      estado: 'PENDIENTE',
      historialPagos: [],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteVentas],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteVentas);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('debe inicializar en la solapa periodo y cargar los datos del reporte', () => {
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url.includes('/reportes/ventas/periodo'));
    expect(req.request.method).toBe('GET');
    req.flush(mockPeriodo);

    expect(component['reportePeriodo']()).toEqual(mockPeriodo);
    expect(component['metodosPago']().length).toBe(2);
    expect(component['pestanaActiva']()).toBe('periodo');
  });

  it('debe cambiar a solapa ranking y cargar el ranking comercial', () => {
    fixture.detectChanges();
    const reqPeriodo = http.expectOne((r) => r.url.includes('/reportes/ventas/periodo'));
    reqPeriodo.flush(mockPeriodo);

    component['cambiarPestana']('ranking');
    expect(component['pestanaActiva']()).toBe('ranking');

    const reqRanking = http.expectOne((r) => r.url.includes('/reportes/ventas/ranking-comercial'));
    expect(reqRanking.request.method).toBe('GET');
    reqRanking.flush(mockRanking);

    expect(component['reporteRanking']()).toEqual(mockRanking);
  });

  it('debe cambiar a solapa saldos y cargar los saldos pendientes', () => {
    fixture.detectChanges();
    const reqPeriodo = http.expectOne((r) => r.url.includes('/reportes/ventas/periodo'));
    reqPeriodo.flush(mockPeriodo);

    component['cambiarPestana']('saldos');
    expect(component['pestanaActiva']()).toBe('saldos');

    const reqSaldos = http.expectOne((r) => r.url.includes('/ventas/pagos-pendientes'));
    expect(reqSaldos.request.method).toBe('GET');
    reqSaldos.flush(mockSaldos);

    expect(component['cuentasSaldos']().length).toBe(1);
    expect(component['totalDeudaSaldos']()).toBe(600);
    expect(component['totalCobradoSaldos']()).toBe(400);
  });

  it('debe reiniciar filtros al invocar limpiarFiltros', () => {
    fixture.detectChanges();
    const req1 = http.expectOne((r) => r.url.includes('/reportes/ventas/periodo'));
    req1.flush(mockPeriodo);

    component['tipoComprobante'].set('FACTURA');
    component['estadoFiltro'].set('PAGADA');

    component['limpiarFiltros']();

    expect(component['tipoComprobante']()).toBe('TODOS');
    expect(component['estadoFiltro']()).toBe('TODOS');

    const req2 = http.expectOne((r) => r.url.includes('/reportes/ventas/periodo'));
    req2.flush(mockPeriodo);
  });
});
