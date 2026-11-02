import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PacientePerfil } from './paciente-perfil';
import { Paciente } from '../../models/paciente.model';
import { RecetaResumen } from '../../models/receta.model';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { AvisoService } from '../../../../shared/aviso-service';

const paciente: Paciente = {
  idPersona: 7,
  estado: 1,
  estadoDescripcion: 'Activo',
  fechaRegistro: '2026-11-01T09:00:00',
  idUsuario: 2,
  persona: {
    idPersona: 7,
    nombres: 'Ana Demo',
    apellidos: 'Paciente Uno',
    nombreCompleto: 'Ana Demo Paciente Uno',
    tipoDocumento: 'DNI',
    tipoDocumentoDescripcion: 'DNI',
    numeroDocumento: '99010001',
    fechaNacimiento: '1994-03-15',
    sexo: 'FEMENINO',
    sexoDescripcion: 'Femenino',
    telefono: null,
    direccion: null,
  },
};
const receta: RecetaResumen = {
  idReceta: 21,
  fechaRegistro: '2026-11-01T11:00:00',
  esExterno: 0,
  esRecetaExterna: false,
  idPaciente: 7,
  nombreCompletoPaciente: paciente.persona.nombreCompleto,
  numeroDocumentoPaciente: '99010001',
  idEmpleado: 2,
  nombreCompletoEmpleado: 'Operador Prueba',
};
const pagina = (content: RecetaResumen[] = []): PaginaResponse<RecetaResumen> => ({
  content,
  number: 0,
  size: 3,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  first: true,
  last: true,
  empty: !content.length,
});

describe('PacientePerfil', () => {
  let fixture: ComponentFixture<PacientePerfil>;
  let http: HttpTestingController;
  const abrir = (id = '7') => {
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
  };
  const cargar = (datos = paciente) => {
    abrir(String(datos.idPersona));
    http.expectOne((r) => r.url.endsWith(`/pacientes/${datos.idPersona}`)).flush(datos);
    fixture.detectChanges();
    return http.expectOne((r) => r.url.endsWith(`/paciente/${datos.idPersona}/historial`));
  };
  const estado = () =>
    fixture.nativeElement.querySelector('.header-actions button') as HTMLButtonElement;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PacientePerfil],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PacientePerfil);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    fixture.destroy();
    http.verify({ ignoreCancelled: true });
  });

  it('should load the patient before the recent recipes and show only available information', () => {
    abrir();
    expect(fixture.nativeElement.textContent).toContain('Cargando perfil');
    http.expectNone((r) => r.url.includes('/historial'));
    http.expectOne((r) => r.url.endsWith('/pacientes/7')).flush(paciente);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ana Demo Paciente Uno');
    expect(fixture.nativeElement.textContent).toContain('Cargando recetas');
    const historial = http.expectOne((r) => r.url.includes('/historial'));
    expect(historial.request.params.get('size')).toBe('3');
    historial.flush(pagina([receta]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Operador Prueba');
    expect(fixture.nativeElement.textContent).toContain('Sin registrar');
    expect(fixture.nativeElement.textContent).not.toContain('Norma MINSA');
    expect(fixture.nativeElement.textContent).not.toContain('HC-');
    expect(fixture.nativeElement.querySelectorAll('.clinical-card:disabled')).toHaveLength(0);
  });

  it('should block new clinical actions for an inactive patient while retaining history access', () => {
    cargar({ ...paciente, estado: 0 }).flush(pagina());
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll(
      '.clinical-card',
    ) as NodeListOf<HTMLButtonElement>;
    expect(cards[0].disabled).toBe(true);
    expect(cards[1].disabled).toBe(true);
    expect(cards[2].disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Paciente inactivo.');
    expect(estado().textContent).toContain('Reactivar paciente');
  });

  it('should show empty history only after a successful empty response', () => {
    cargar().flush(pagina());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aún no hay recetas registradas');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('should keep the patient visible when the recipe query fails and allow retry', () => {
    cargar().flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ana Demo Paciente Uno');
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar las recetas');
    expect(fixture.nativeElement.textContent).not.toContain('Aún no hay recetas registradas');
    (fixture.nativeElement.querySelector('.retry') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/pacientes/7')).flush(paciente);
    http.expectOne((r) => r.url.includes('/historial')).flush(pagina());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aún no hay recetas registradas');
  });

  it('should reject malformed identifiers without requesting API data', () => {
    abrir('7.2');
    expect(fixture.nativeElement.textContent).toContain(
      'El identificador del paciente no es válido',
    );
    http.expectNone(() => true);
  });

  it('should distinguish a missing session from a missing or empty patient profile', () => {
    abrir();
    http
      .expectOne((r) => r.url.endsWith('/pacientes/7'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Inicia sesión');
    expect(fixture.nativeElement.querySelector('.clinical')).toBeNull();
    http.expectNone((r) => r.url.includes('/historial'));
  });

  it('should cancel a stale history request when navigating to another patient', () => {
    const anterior = cargar();
    abrir('8');
    expect(anterior.cancelled).toBe(true);
    http
      .expectOne((r) => r.url.endsWith('/pacientes/8'))
      .flush({
        ...paciente,
        idPersona: 8,
        persona: { ...paciente.persona, idPersona: 8, nombreCompleto: 'Paciente siguiente' },
      });
    http.expectOne((r) => r.url.includes('/paciente/8/historial')).flush(pagina());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Paciente siguiente');
    expect(fixture.nativeElement.textContent).not.toContain('Ana Demo Paciente Uno');
  });

  it('should send no write on cancel and prevent repeated state-change clicks', async () => {
    cargar().flush(pagina());
    fixture.detectChanges();
    estado().click();
    fixture.detectChanges();
    expect(estado().disabled).toBe(true);
    TestBed.inject(AvisoService).cerrar();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(estado().disabled).toBe(false);
    http.expectNone((r) => r.method === 'PATCH');
  });

  it('should update the profile after confirmed reactivation without losing recent recipes', async () => {
    cargar({ ...paciente, estado: 0 }).flush(pagina([receta]));
    fixture.detectChanges();
    estado().click();
    fixture.detectChanges();
    const avisos = TestBed.inject(AvisoService);
    avisos.ejecutar(avisos.actual()!.acciones![0]);
    await Promise.resolve();
    const req = http.expectOne((r) => r.method === 'PATCH');
    expect(req.request.body).toEqual({ estado: 1 });
    req.flush(paciente);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Nuevo examen visual"]').disabled).toBe(
      false,
    );
    expect(fixture.nativeElement.textContent).toContain('Operador Prueba');
    expect(avisos.actual()?.tipo).toBe('exito');
  });

  it('should retain the original state if the server denies a change', async () => {
    cargar().flush(pagina());
    fixture.detectChanges();
    estado().click();
    fixture.detectChanges();
    const avisos = TestBed.inject(AvisoService);
    avisos.ejecutar(avisos.actual()!.acciones![0]);
    await Promise.resolve();
    http.expectOne((r) => r.method === 'PATCH').flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status').textContent).toContain('Activo');
    expect(avisos.actual()?.tipo).toBe('error');
    expect(estado().disabled).toBe(false);
  });
});
