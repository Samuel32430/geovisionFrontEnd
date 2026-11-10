import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { QrPagoModal } from './qr-pago-modal';

describe('QrPagoModal', () => {
  let fixture: ComponentFixture<QrPagoModal>;
  let component: QrPagoModal;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrPagoModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(QrPagoModal);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('debe crearse y solicitar la orden QR dinámico al inicializarse', () => {
    fixture.componentRef.setInput('monto', 150);
    fixture.detectChanges();

    const req = http.expectOne(`${environment.apiUrl}/ventas/pagos/mercadopago/qr`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      idVenta: null,
      monto: 150,
      descripcion: 'Cobro de Venta GeoVision',
    });

    req.flush({
      qrData: '00020126580014com.mercadolibre...',
      externalReference: 'REF-1',
      monto: 150,
      estado: 'CREADO',
      qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=00020126',
    });
    fixture.detectChanges();

    expect(component['cargando']()).toBe(false);
    expect(component['error']()).toBeNull();
    expect(component['qrData']()).toBe('00020126580014com.mercadolibre...');
    expect(component['qrImageUrl']()).toContain('https://api.qrserver.com');

    const imgElement = fixture.nativeElement.querySelector('.qr-img') as HTMLImageElement;
    expect(imgElement).toBeTruthy();
    expect(imgElement.src).toContain('https://api.qrserver.com');
  });

  it('debe manejar error al generar el QR y permitir reintentar', () => {
    fixture.componentRef.setInput('monto', 200);
    fixture.detectChanges();

    const req1 = http.expectOne(`${environment.apiUrl}/ventas/pagos/mercadopago/qr`);
    req1.flush(
      { mensaje: 'Error de conexión con Mercado Pago' },
      { status: 500, statusText: 'Server Error' }
    );
    fixture.detectChanges();

    expect(component['cargando']()).toBe(false);
    expect(component['error']()).toBe('Error de conexión con Mercado Pago');

    const errorBox = fixture.nativeElement.querySelector('.qr-error');
    expect(errorBox).toBeTruthy();

    // Reintentar
    component['reintentar']();
    fixture.detectChanges();

    expect(component['cargando']()).toBe(true);
    const req2 = http.expectOne(`${environment.apiUrl}/ventas/pagos/mercadopago/qr`);
    req2.flush({
      qrData: '00020126580014reintento...',
      externalReference: 'REF-2',
      monto: 200,
      estado: 'CREADO',
      qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=reintento',
    });
    fixture.detectChanges();

    expect(component['cargando']()).toBe(false);
    expect(component['error']()).toBeNull();
    expect(component['qrData']()).toBe('00020126580014reintento...');
  });

  it('debe emitir confirmar con el número de operación trimeado', () => {
    fixture.componentRef.setInput('monto', 100);
    fixture.detectChanges();

    const req = http.expectOne(`${environment.apiUrl}/ventas/pagos/mercadopago/qr`);
    req.flush({
      qrData: '000201...',
      externalReference: 'REF-3',
      monto: 100,
      estado: 'CREADO',
      qrImageUrl: 'https://qrserver.com/qr.png',
    });
    fixture.detectChanges();

    let operacionConfirmada = '';
    component.confirmar.subscribe((val) => {
      operacionConfirmada = val;
    });

    component['numeroOperacion'].set('   OP-998822   ');
    component['confirmarPago']();

    expect(operacionConfirmada).toBe('OP-998822');
  });

  it('debe emitir cerrar al invocar cerrar', () => {
    fixture.componentRef.setInput('monto', 100);
    fixture.detectChanges();

    const req = http.expectOne(`${environment.apiUrl}/ventas/pagos/mercadopago/qr`);
    req.flush({
      qrData: '000201...',
      externalReference: 'REF-4',
      monto: 100,
      estado: 'CREADO',
    });

    let cerrarEmitido = false;
    component.cerrar.subscribe(() => {
      cerrarEmitido = true;
    });

    component.cerrar.emit();
    expect(cerrarEmitido).toBe(true);
  });

  it('debe alternar la billetera seleccionada entre YAPE y PLIN', () => {
    fixture.componentRef.setInput('monto', 100);
    fixture.detectChanges();

    const req = http.expectOne(`${environment.apiUrl}/ventas/pagos/mercadopago/qr`);
    req.flush({
      qrData: '000201...',
      externalReference: 'REF-5',
      monto: 100,
      estado: 'CREADO',
    });

    expect(component['billetera']()).toBe('YAPE');
    component['billetera'].set('PLIN');
    expect(component['billetera']()).toBe('PLIN');
  });
});
