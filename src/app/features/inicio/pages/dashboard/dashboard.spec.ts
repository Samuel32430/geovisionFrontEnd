import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { SesionService } from '../../../../core/auth/sesion-service';
import { PacienteList } from '../../../atencion-paciente-consulta/pages/paciente-list/paciente-list';
import { Dashboard } from './dashboard';

const base = environment.apiUrl;
const vacia = { content: [], totalElements: 0, totalPages: 0, number: 0, first: true, last: true };
const venta = {
  idVenta: 101,
  numeroComprobante: 'B001-101',
  clienteNombre: 'Paciente de prueba',
  total: 35,
  estado: 'PAGADA',
  tieneReceta: true,
};

describe('Dashboard', () => {
  let http: HttpTestingController;
  let tienePermiso: (permiso: string | readonly string[]) => boolean;

  beforeEach(() => {
    tienePermiso = () => true;
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([
          { path: 'inicio', component: Dashboard },
          { path: 'atencion-paciente-consulta/pacientes', component: PacienteList },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SesionService,
          useValue: { tienePermiso: (permiso: string) => tienePermiso(permiso) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function valores(element: HTMLElement) {
    return Array.from(element.querySelectorAll('.stat-value'), (node) => node.textContent?.trim());
  }

  it('muestra ceros únicamente cuando las fuentes confirman que no hay datos', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    http.expectOne(base + '/inicio/ventas').flush({ total: 0, cantidad: 0 });
    http.expectOne(base + '/inicio/ordenes').flush({ enProceso: 0, listasParaEntrega: 0 });
    http.expectOne(base + '/inicio/atenciones').flush({
      pacientes: 0,
      primerasVeces: 0,
      totalConsultas: 0,
      recientes: [],
    });
    http.expectOne((r) => r.url === base + '/inventario/alertas/bajo-stock').flush([]);
    http.expectOne((r) => r.url === base + '/ventas/historial').flush(vacia);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(valores(element)).toEqual(['S/ 0.00', '0 órdenes', '0 atendidos', '0 productos']);
    expect(element.textContent).toContain('Aún no hay ventas ni pedidos');
    expect(element.textContent).toContain('No hay consultas registradas');
    expect(element.textContent).toContain('Sin alertas para mostrar');
  });

  it('muestra los datos reales y mantiene el total de ventas al cambiar la página de recientes', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    http.expectOne(base + '/inicio/ventas').flush({ total: 825.5, cantidad: 12 });
    http.expectOne(base + '/inicio/ordenes').flush({ enProceso: 4, listasParaEntrega: 2 });
    http.expectOne(base + '/inicio/atenciones').flush({
      pacientes: 2,
      primerasVeces: 1,
      totalConsultas: 3,
      recientes: [
        {
          idReceta: 12,
          idPaciente: 5,
          paciente: 'Consulta sintética',
          fechaRegistro: '2026-11-19T10:30:00',
        },
      ],
    });
    http
      .expectOne(
        (r) => r.url === base + '/inventario/alertas/bajo-stock' && r.params.get('umbral') === '5',
      )
      .flush([{ idProducto: 7, nombre: 'Montura de prueba', stock: 3 }]);
    http
      .expectOne((r) => r.url === base + '/ventas/historial' && r.params.get('page') === '0')
      .flush({ ...vacia, content: [venta], totalElements: 12, totalPages: 3, last: false });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(valores(element)).toEqual(['S/ 825.50', '6 órdenes', '2 atendidos', '1 producto']);
    expect(element.textContent).toContain('Montura de prueba');
    expect(element.textContent).toContain('Consulta sintética');
    expect(element.textContent).toContain('B001-101');
    expect(element.textContent).toContain('2 listas para entrega');
    const siguiente = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Siguiente',
    );
    siguiente?.click();
    http
      .expectOne((r) => r.url === base + '/ventas/historial' && r.params.get('page') === '1')
      .flush({
        ...vacia,
        content: [{ ...venta, idVenta: 102, numeroComprobante: 'B001-102' }],
        totalElements: 12,
        totalPages: 3,
        number: 1,
        first: false,
        last: false,
      });
    fixture.detectChanges();
    expect(valores(element)[0]).toBe('S/ 825.50');
    expect(element.textContent).toContain('B001-102');

    element.querySelector<HTMLButtonElement>('.btn-action')?.click();
    http.expectOne(base + '/ventas/historial/102/detalle').flush({
      idVenta: 102,
      numeroComprobante: 'B001-102',
      total: 35,
      pagos: [],
      productos: [],
      servicios: [],
    });
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')?.textContent).toContain('B001-102');
  });

  it('distingue un fallo de red y un panel sin permisos de los datos vacíos', () => {
    tienePermiso = (permiso) => permiso === 'ORDENES_TRABAJO_LEER';
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    http
      .expectOne(base + '/inicio/ordenes')
      .flush(null, { status: 503, statusText: 'No disponible' });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(valores(element)).toEqual(['—', '—', '—', '—']);
    expect(element.textContent).toContain('No se pudo consultar');
    expect(element.textContent).toContain('Sin permiso de consulta');
    expect(element.querySelector('[role="search"]')).toBeNull();
  });

  it('abre Atención al paciente y envía el término al buscador existente', async () => {
    tienePermiso = (permiso) => permiso === 'PACIENTES_LEER';
    const harness = await RouterTestingHarness.create('/inicio');
    http.expectOne(base + '/inicio/atenciones').flush({
      pacientes: 0,
      primerasVeces: 0,
      totalConsultas: 0,
      recientes: [],
    });
    harness.detectChanges();

    const inicio = harness.routeNativeElement!;
    expect(inicio.querySelector('[aria-label="Notificaciones"]')).toBeNull();
    const form = inicio.querySelector<HTMLFormElement>('[role="search"]')!;
    const input = form.querySelector('input')!;
    expect(form.querySelector('button')?.disabled).toBe(true);
    input.value = '  María & Pérez  ';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();

    const router = TestBed.inject(Router);
    const navegacion = firstValueFrom(
      router.events.pipe(filter((e) => e instanceof NavigationEnd)),
    );
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await navegacion;
    harness.detectChanges();

    expect(router.parseUrl(router.url).queryParams['buscar']).toBe('María & Pérez');
    const resultado = http.expectOne(
      (r) => r.url === base + '/pacientes' && r.params.get('termino') === 'María & Pérez',
    );
    resultado.flush(vacia);
    http.match((r) => r.url === base + '/pacientes').forEach((req) => req.flush(vacia));
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain(
      'No se encontraron pacientes para el criterio de búsqueda',
    );
  });

  it('limita las sugerencias a tres pacientes y cancela la búsqueda anterior', () => {
    vi.useFakeTimers();
    try {
      tienePermiso = (permiso) => permiso === 'PACIENTES_LEER';
      const fixture = TestBed.createComponent(Dashboard);
      fixture.detectChanges();
      http.expectOne(base + '/inicio/atenciones').flush({
        pacientes: 0,
        primerasVeces: 0,
        totalConsultas: 0,
        recientes: [],
      });
      const element: HTMLElement = fixture.nativeElement;
      const input = element.querySelector('input')!;
      const escribir = (valor: string) => {
        input.value = valor;
        input.dispatchEvent(new Event('input'));
        vi.advanceTimersByTime(250);
        fixture.detectChanges();
      };

      escribir('M');
      http.expectNone((r) => r.url === base + '/pacientes');
      escribir('Ma');
      const anterior = http.expectOne(
        (r) => r.url === base + '/pacientes' && r.params.get('termino') === 'Ma',
      );
      escribir('Mar');
      expect(anterior.cancelled).toBe(true);
      const actual = http.expectOne(
        (r) => r.url === base + '/pacientes' && r.params.get('termino') === 'Mar',
      );
      expect(actual.request.params.get('size')).toBe('3');
      expect(actual.request.params.get('estado')).toBe('1');
      actual.flush({
        ...vacia,
        content: [1, 2, 3, 4].map((id) => ({
          id,
          persona: { id, nombreCompleto: `María ${id}`, numeroDocumento: `0000000${id}` },
        })),
      });
      fixture.detectChanges();

      const lista = element.querySelector('[aria-label="Pacientes coincidentes"]')!;
      expect(lista.querySelectorAll('li').length).toBe(3);
      expect(lista.querySelector('a')?.getAttribute('href')).toBe(
        '/atencion-paciente-consulta/pacientes/1',
      );
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(element.querySelector('.search-results')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
