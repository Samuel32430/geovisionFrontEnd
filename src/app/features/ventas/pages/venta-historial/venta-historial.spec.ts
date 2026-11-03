import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { VentaHistorial } from './venta-historial';

describe('VentaHistorial', () => {
  let fixture: ComponentFixture<VentaHistorial>;
  let component: VentaHistorial;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VentaHistorial],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(VentaHistorial);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('debe cargar el historial de ventas en ngOnInit', () => {
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/ventas/historial`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');

    req.flush({
      content: [
        {
          idVenta: 1,
          numeroComprobante: 'B001-001',
          clienteNombre: 'Juan Perez',
          total: 500,
          saldoPendiente: 0,
          estado: 'PAGADA',
          estadoDescripcion: 'Pagada Totalmente',
        },
      ],
      totalElements: 1,
      totalPages: 1,
    });

    expect(component['ventas']().length).toBe(1);
    expect(component['totalElementos']()).toBe(1);
  });

  it('debe abrir el modal de detalle con los datos de la venta seleccionada', () => {
    fixture.detectChanges();
    const reqList = http.expectOne((r) => r.url === `${environment.apiUrl}/ventas/historial`);
    reqList.flush({ content: [], totalElements: 0, totalPages: 0 });

    component['abrirDetalle'](1);

    const reqDetalle = http.expectOne(`${environment.apiUrl}/ventas/historial/1/detalle`);
    expect(reqDetalle.request.method).toBe('GET');
    reqDetalle.flush({
      idVenta: 1,
      numeroComprobante: 'B001-001',
      total: 500,
      saldoPendiente: 0,
      estado: 'PAGADA',
      productos: [],
      servicios: [],
      pagos: [],
    });

    expect(component['ventaSeleccionada']()).not.toBeNull();
    expect(component['ventaSeleccionada']()?.idVenta).toBe(1);
  });

  it('debe limpiar los filtros y recargar la página 0', () => {
    fixture.detectChanges();
    const reqInit = http.expectOne((r) => r.url === `${environment.apiUrl}/ventas/historial`);
    reqInit.flush({ content: [], totalElements: 0, totalPages: 0 });

    component['termino'].set('Carlos');
    component['estadoFiltro'].set(1);
    component['limpiarFiltros']();

    expect(component['termino']()).toBe('');
    expect(component['estadoFiltro']()).toBe(-1);

    const reqReset = http.expectOne((r) => r.url === `${environment.apiUrl}/ventas/historial`);
    expect(reqReset.request.params.get('termino')).toBeNull();
    reqReset.flush({ content: [], totalElements: 0, totalPages: 0 });
  });
});
