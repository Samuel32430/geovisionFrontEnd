import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { NuevaVenta } from './nueva-venta';
import { RecetaDetalle } from '../../../atencion-paciente-consulta/models/receta.model';

describe('NuevaVenta', () => {
  let fixture: ComponentFixture<NuevaVenta>;
  let component: NuevaVenta;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaVenta],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevaVenta);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);

    // Initial monturas call
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/catalogos-opticos/monturas`);
    req.flush({ content: [{ idProducto: 1, codigo: 'RB-01', nombre: 'Ray-Ban Aviator', precio: 300 }] });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('debe iniciar con carrito vacío, total cero y modo público general', () => {
    expect(component['carrito']().length).toBe(0);
    expect(component['total']()).toBe(0);
    expect(component['modoCliente']()).toBe('PUBLICO_GENERAL');
    expect(component['tipoComprobante']()).toBe('BOLETA');
  });

  it('debe agregar montura al carrito y calcular el total correctamente', () => {
    component['agregarMonturaAlCarrito']({
      idProducto: 1,
      codigo: 'RB-01',
      nombre: 'Ray-Ban Aviator',
      precio: 300,
      stock: 5,
      color: 'Dorado',
      modeloDescripcion: null,
      materialDescripcion: null,
    });

    expect(component['carrito']().length).toBe(1);
    expect(component['total']()).toBe(300);

    // Cambiar cantidad
    component['cambiarCantidad'](0, 1);
    expect(component['total']()).toBe(600);

    // Eliminar ítem
    component['eliminarItem'](0);
    expect(component['total']()).toBe(0);
  });

  it('no debe permitir seleccionar adelanto si no existe receta vinculada (RN-VE06)', () => {
    component['agregarItemPersonalizado']();
    component['seleccionarModalidad']('ADELANTO');

    // Debe permanecer en COMPLETO
    expect(component['modalidadPago']()).toBe('COMPLETO');
  });

  it('debe permitir adelanto si se asocia una receta oftalmológica (RN-VE07)', () => {
    const recetaMock: RecetaDetalle = {
      idReceta: 84,
      fechaRegistro: '2024-10-24T10:00:00',
      esExterno: 0,
      esRecetaExterna: false,
      idPaciente: 12,
      nombreCompletoPaciente: 'Maria Rodriguez',
      numeroDocumentoPaciente: '45892123',
      idEmpleado: 2,
      nombreCompletoEmpleado: 'Dra. Claudia',
      medidas: [],
      lentes: [
        {
          idLente: 1,
          subTotal: 200,
          nombreMaterialCristal: 'Policarbonato',
          nombreMontura: 'Ray-Ban',
          codigoMontura: 'RB-01',
          tratamientos: [],
        },
      ],
    };

    component['aplicarRecetaAlCarrito'](recetaMock);
    expect(component['recetaDetalle']()).not.toBeNull();
    expect(component['carrito']().length).toBe(2);

    component['seleccionarModalidad']('ADELANTO');
    expect(component['modalidadPago']()).toBe('ADELANTO');
    expect(component['montoAdelanto']()).toBe(component['adelantoMinimo']());
  });

  it('debe exigir voucher/operacion para pagos con tarjeta o transferencia (RN-VE12)', () => {
    component['agregarItemPersonalizado']();
    component['seleccionarMedioPago']('TARJETA_DEBITO');

    component['registrarVenta']();
    expect(component['error']()).toContain('número de operación o voucher es obligatorio');
  });
});
