import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PacienteHistorial } from './paciente-historial';

const receta = {
  idReceta: 21,
  idPaciente: 7,
  fechaRegistro: '2026-11-01T11:00:00',
  esExterno: 0,
  esRecetaExterna: false,
  nombreCompletoEmpleado: 'Operador Prueba',
  medidas: [],
  lentes: [],
};
const paciente = {
  idPersona: 7,
  estado: 1,
  persona: { nombres: 'Ana', apellidos: 'Demo', numeroDocumento: '99010001' },
};
const pagina = (content: unknown[]) => ({
  content,
  number: 0,
  size: 10,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  first: true,
  last: true,
});

describe('PacienteHistorial', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PacienteHistorial],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '7' })),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function abrir(content: unknown[]) {
    const fixture = TestBed.createComponent(PacienteHistorial);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/pacientes/7')).flush(paciente);
    const req = http.expectOne((r) => r.url.endsWith('/paciente/7/historial'));
    expect(req.request.params.get('size')).toBe('10');
    req.flush(pagina(content));
    fixture.detectChanges();
    return fixture;
  }
  it('muestra el estado vacío sin solicitar un detalle', () => {
    const f = abrir([]);
    expect(f.nativeElement.textContent).toContain('Aún no hay recetas registradas');
  });
  it('rechaza un detalle que no pertenece al paciente', () => {
    const f = abrir([receta]);
    http.expectOne((r) => r.url.endsWith('/recetas/21')).flush({ ...receta, idPaciente: 8 });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('La receta no pertenece a este paciente');
    expect(f.nativeElement.textContent).not.toContain('Descargar PDF');
  });
  it('cancela el detalle anterior al seleccionar otra receta', () => {
    const f = abrir([receta, { ...receta, idReceta: 22 }]);
    const anterior = http.expectOne((r) => r.url.endsWith('/recetas/21'));
    (f.nativeElement.querySelectorAll('.recipe')[1] as HTMLButtonElement).click();
    expect(anterior.cancelled).toBe(true);
    http.expectOne((r) => r.url.endsWith('/recetas/22')).flush({ ...receta, idReceta: 22 });
    f.detectChanges();
    expect(f.nativeElement.querySelector('.detail-heading').textContent).toContain('Receta #22');
  });
  it('permite reintentar después de un error al consultar el historial', () => {
    const f = TestBed.createComponent(PacienteHistorial);
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/pacientes/7')).flush(paciente);
    http
      .expectOne((r) => r.url.endsWith('/paciente/7/historial'))
      .flush({}, { status: 500, statusText: 'Error' });
    f.detectChanges();
    const button = [...f.nativeElement.querySelectorAll('button')].find((b: any) =>
      b.textContent.includes('Reintentar'),
    ) as HTMLButtonElement;
    button.click();
    http.expectOne((r) => r.url.endsWith('/pacientes/7')).flush(paciente);
    http.expectOne((r) => r.url.endsWith('/paciente/7/historial')).flush(pagina([]));
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Aún no hay recetas registradas');
  });
});
