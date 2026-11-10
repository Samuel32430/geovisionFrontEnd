import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Dashboard } from './dashboard';
import { VentaService } from '../../../ventas/services/venta.service';
import { PaginaVentaHistorial } from '../../../ventas/models/venta.model';

describe('Dashboard', () => {
  it('should show zero indicators and empty sections without sample patient data', async () => {
    const mockVentaService = {
      historial: () =>
        of<PaginaVentaHistorial>({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 5,
          number: 0,
          first: true,
          last: true,
          empty: true,
        }),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), { provide: VentaService, useValue: mockVentaService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.stat').length).toBe(4);
    expect(
      Array.from(element.querySelectorAll('.stat-value')).map((node) => node.textContent?.trim()),
    ).toEqual(['S/ 0.00', '0 órdenes', '0 atendidos', '0 productos']);
    expect(element.textContent).toContain('Aún no hay ventas ni pedidos');
    expect(element.textContent).toContain('No hay consultas registradas');
    expect(element.textContent).toContain('Sin alertas para mostrar');
    expect(
      Array.from(element.querySelectorAll('.pagination button')).every(
        (button) => (button as HTMLButtonElement).disabled,
      ),
    ).toBe(true);

    const linkNuevaVenta = element.querySelector('a.btn-primary');
    expect(linkNuevaVenta?.getAttribute('href')).toBe('/ventas/nueva');
  });

  it('debe cargar ventas recientes y actualizar el total de ventas del día', async () => {
    const d = new Date(); const pad = (n: number) => n.toString().padStart(2, "0"); const hoyStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00:00`;
    const mockVentaService = {
      historial: () =>
        of<PaginaVentaHistorial>({
          content: [
            {
              idVenta: 101,
              numeroComprobante: 'B001-06828350',
              tipoComprobante: 'BOLETA',
              tipoComprobanteDescripcion: 'Boleta de Venta',
              clienteNombre: 'Samuel Vilca Salinas',
              clienteDocumento: '70961428',
              vendedorNombre: 'Admin',
              total: 35.0,
              totalPagado: 35.0,
              saldoPendiente: 0,
              estado: 'PAGADA',
              estadoDescripcion: 'Pagada Totalmente',
              tieneReceta: false,
              cantidadItems: 1,
              fechaRegistro: hoyStr,
            },
            {
              idVenta: 102,
              numeroComprobante: 'B001-06702178',
              tipoComprobante: 'BOLETA',
              tipoComprobanteDescripcion: 'Boleta de Venta',
              clienteNombre: 'Público General',
              clienteDocumento: '',
              vendedorNombre: 'Admin',
              total: 35.0,
              totalPagado: 35.0,
              saldoPendiente: 0,
              estado: 'PAGADA',
              estadoDescripcion: 'Pagada Totalmente',
              tieneReceta: false,
              cantidadItems: 1,
              fechaRegistro: hoyStr,
            },
            {
              idVenta: 103,
              numeroComprobante: 'NV01-06673653',
              tipoComprobante: 'NOTA_VENTA',
              tipoComprobanteDescripcion: 'Nota de Venta',
              clienteNombre: 'Público General',
              clienteDocumento: '',
              vendedorNombre: 'Admin',
              total: 70.0,
              totalPagado: 70.0,
              saldoPendiente: 0,
              estado: 'PAGADA',
              estadoDescripcion: 'Pagada Totalmente',
              tieneReceta: false,
              cantidadItems: 2,
              fechaRegistro: hoyStr,
            },
          ],
          totalElements: 3,
          totalPages: 1,
          size: 5,
          number: 0,
          first: true,
          last: true,
          empty: false,
        }),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), { provide: VentaService, useValue: mockVentaService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    // Indicador de Ventas del día: 35 + 35 + 70 = 140.00
    const statValues = Array.from(element.querySelectorAll('.stat-value')).map((node) =>
      node.textContent?.trim(),
    );
    expect(statValues[0]).toBe('S/ 140.00');

    // Debe mostrar las 3 filas en la tabla
    const filas = element.querySelectorAll('tbody tr');
    expect(filas.length).toBe(3);
    expect(element.textContent).toContain('B001-06828350');
    expect(element.textContent).toContain('Samuel Vilca Salinas');
    expect(element.textContent).toContain('NV01-06673653');
  });
});
