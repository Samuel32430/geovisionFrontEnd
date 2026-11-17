import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { PagosPendientes } from './pagos-pendientes';
import { PagoPendienteItem } from '../../models/pago-pendiente.model';

describe('PagosPendientes', () => {
  let fixture: ComponentFixture<PagosPendientes>;
  let component: PagosPendientes;
  let http: HttpTestingController;

  const cuentasMock: PagoPendienteItem[] = [
    {
      idVenta: 10,
      numeroComprobante: 'B001-010',
      fechaVenta: '2024-10-25T16:00:00',
      idPaciente: 3,
      pacienteNombre: 'Laura Martinez',
      pacienteTelefono: '987654321',
      pacienteDocumento: '28123456',
      totalVenta: 3000,
      totalPagado: 1500,
      saldoPendiente: 1500,
      estado: 'PENDIENTE',
      historialPagos: [],
    },
    {
      idVenta: 15,
      numeroComprobante: 'B001-015',
      fechaVenta: '2024-10-26T11:00:00',
      idPaciente: 4,
      pacienteNombre: 'Carlos Fernandez',
      pacienteTelefono: '981112233',
      pacienteDocumento: '19876543',
      totalVenta: 8900,
      totalPagado: 4000,
      saldoPendiente: 4900,
      estado: 'PENDIENTE',
      historialPagos: [],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagosPendientes],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PagosPendientes);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('debe cargar las cuentas pendientes y calcular metricas en ngOnInit', () => {
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/ventas/pagos-pendientes`);
    expect(req.request.method).toBe('GET');
    req.flush(cuentasMock);

    expect(component['cuentas']().length).toBe(2);
    expect(component['totalOrdenes']()).toBe(2);
    expect(component['totalDeuda']()).toBe(6400); // 1500 + 4900
  });

  it('debe seleccionar la cuenta para abrir el modal de abono', () => {
    fixture.detectChanges();
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/ventas/pagos-pendientes`);
    req.flush(cuentasMock);

    component['iniciarCobro'](cuentasMock[0]);
    expect(component['cuentaSeleccionada']()).toEqual(cuentasMock[0]);
  });

  it('debe registrar un abono exitosamente y recargar la lista', () => {
    fixture.detectChanges();
    const reqInit = http.expectOne((r) => r.url === `${environment.apiUrl}/ventas/pagos-pendientes`);
    reqInit.flush(cuentasMock);

    component['iniciarCobro'](cuentasMock[0]);
    component['procesarAbono']({
      idVenta: 10,
      monto: 1500,
      metodoPago: 'EFECTIVO',
    });

    const reqPost = http.expectOne(`${environment.apiUrl}/ventas/pagos-pendientes`);
    expect(reqPost.request.method).toBe('POST');
    expect(reqPost.request.body).toEqual({
      idVenta: 10,
      monto: 1500,
      metodoPago: 'EFECTIVO',
    });
    reqPost.flush({ idPago: 88, monto: 1500, metodoPago: 'EFECTIVO' });

    // Se debe disparar la recarga
    const reqReload = http.expectOne((r) => r.url === `${environment.apiUrl}/ventas/pagos-pendientes`);
    reqReload.flush([cuentasMock[1]]);

    expect(component['cuentaSeleccionada']()).toBeNull();
    expect(component['cuentas']().length).toBe(1);
  });
});
