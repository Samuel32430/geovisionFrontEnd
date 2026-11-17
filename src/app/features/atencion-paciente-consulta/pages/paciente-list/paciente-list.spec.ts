import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PacienteList } from './paciente-list';
import { Paciente, PaginaPacientes } from '../../models/paciente.model';
import { AvisoService } from '../../../../shared/aviso-service';
import { provideRouter } from '@angular/router';
import { PacienteService } from '../../services/paciente';
import { of } from 'rxjs';

const paciente: Paciente = {
  idPersona: 7,
  estado: 1,
  estadoDescripcion: 'Activo',
  fechaRegistro: '2026-11-01T10:30:00',
  idUsuario: 2,
  persona: {
    idPersona: 7,
    nombres: 'Paciente',
    apellidos: 'Prueba',
    nombreCompleto: 'Paciente Prueba',
    telefono: null,
    fechaNacimiento: null,
    sexo: null,
    sexoDescripcion: null,
    direccion: null,
    tipoDocumento: 'DNI',
    tipoDocumentoDescripcion: 'Documento Nacional de Identidad',
    numeroDocumento: '00000007',
  },
};
const pagina = (
  content: Paciente[] = [],
  number = 0,
  totalElements = content.length,
): PaginaPacientes => ({
  content,
  number,
  size: 10,
  totalElements,
  totalPages: Math.ceil(totalElements / 10),
  first: number === 0,
  last: (number + 1) * 10 >= totalElements,
  empty: !content.length,
});

describe('PacienteList', () => {
  let fixture: ComponentFixture<PacienteList>;
  let http: HttpTestingController;
  const boton = (texto: string) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    )!;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PacienteList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    vi.spyOn(TestBed.inject(PacienteService), 'resumen').mockReturnValue(
      of({ activos: 12, inactivos: 3, total: 15 }),
    );
    fixture = TestBed.createComponent(PacienteList);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify({ ignoreCancelled: true });
  });

  it('should show loading then a populated table without the empty-search preview', () => {
    expect(fixture.nativeElement.textContent).toContain('Cargando pacientes');
    const req = http.expectOne((r) => r.url.endsWith('/pacientes'));
    expect(req.request.params.get('estado')).toBe('1');
    req.flush(pagina([paciente]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Paciente Prueba');
    expect(fixture.nativeElement.textContent).not.toContain('No se encontraron pacientes');
    expect(fixture.nativeElement.querySelectorAll('.tabs button').length).toBe(2);
    expect(fixture.nativeElement.querySelector('[aria-label="Pacientes por página"]').value).toBe(
      '10',
    );
    const resumen = fixture.nativeElement.querySelector('.summaries') as HTMLElement;
    expect(
      Array.from(resumen.querySelectorAll('article > strong, .metric-line > strong')).map((valor) =>
        valor.textContent?.trim(),
      ),
    ).toEqual(['15', '12', '3']);
    expect(resumen.textContent).toContain('80% del total');
  });

  it('should reset the server page on state changes and preserve the page size', () => {
    http.expectOne((r) => r.url.endsWith('/pacientes')).flush(pagina([paciente], 0, 21));
    fixture.detectChanges();
    boton('Siguiente ›').click();
    fixture.detectChanges();
    const segunda = http.expectOne((r) => r.params.get('page') === '1');
    segunda.flush(pagina([paciente], 1, 21));
    fixture.detectChanges();
    boton('Inactivos').click();
    fixture.detectChanges();
    const inactivos = http.expectOne((r) => r.params.get('estado') === '0');
    expect(inactivos.request.params.get('page')).toBe('0');
    expect(inactivos.request.params.get('size')).toBe('10');
    inactivos.flush(pagina());
  });

  it('should cancel stale requests and show no-match only after a successful search', () => {
    const anterior = http.expectOne((r) => r.url.endsWith('/pacientes'));
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'nadie';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(anterior.cancelled).toBe(true);
    http.expectOne((r) => r.params.get('termino') === 'nadie').flush(pagina());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'No se encontraron pacientes para el criterio de búsqueda',
    );
    expect(fixture.nativeElement.querySelector('tbody')).toBeNull();
  });

  it('should distinguish auth errors from an empty result and allow retry', () => {
    http
      .expectOne((r) => r.url.endsWith('/pacientes'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Inicia sesión');
    expect(fixture.nativeElement.textContent).not.toContain('No hay pacientes activos registrados');
    boton('Reintentar').click();
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/pacientes')).flush(pagina());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay pacientes activos registrados');
  });

  it('should prevent duplicate state changes and send no write on cancellation', async () => {
    http.expectOne((r) => r.url.endsWith('/pacientes')).flush(pagina([paciente]));
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      '[title="Desactivar paciente"]',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    expect(TestBed.inject(AvisoService).actual()?.tipo).toBe('confirmacion');
    TestBed.inject(AvisoService).cerrar();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
    http.expectNone((r) => r.method === 'PATCH');
  });

  it('should change state only after confirmation and refresh the listing', async () => {
    http.expectOne((r) => r.url.endsWith('/pacientes')).flush(pagina([paciente]));
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector('[title="Desactivar paciente"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    const avisos = TestBed.inject(AvisoService);
    avisos.ejecutar(avisos.actual()!.acciones![0]);
    await Promise.resolve();
    const cambio = http.expectOne((r) => r.method === 'PATCH');
    expect(cambio.request.body).toEqual({ estado: 0 });
    cambio.flush({ ...paciente, estado: 0 });
    http.expectOne((r) => r.method === 'GET').flush(pagina());
    fixture.detectChanges();
    expect(avisos.actual()?.tipo).toBe('exito');
    expect(fixture.nativeElement.textContent).not.toContain('Paciente Prueba');
  });
});
