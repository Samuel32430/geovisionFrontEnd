import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { PacienteForm } from './paciente-form';
import { AvisoService } from '../../../../shared/aviso-service';
import { Paciente } from '../../models/paciente.model';

const paciente: Paciente = {
  idPersona: 7,
  estado: 0,
  estadoDescripcion: 'Inactivo',
  fechaRegistro: '2026-11-01T09:00:00',
  idUsuario: 2,
  persona: {
    idPersona: 7,
    nombres: 'Paciente',
    apellidos: 'Prueba',
    nombreCompleto: 'Paciente Prueba',
    tipoDocumento: 'DNI',
    tipoDocumentoDescripcion: 'DNI',
    numeroDocumento: '99010001',
    telefono: null,
    fechaNacimiento: null,
    sexo: null,
    sexoDescripcion: null,
    direccion: null,
  },
};

describe('PacienteForm', () => {
  let fixture: ComponentFixture<PacienteForm>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;
  const editar = (id: string, valor: string) => {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const enviar = () => {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  };
  const completar = () => {
    editar('numeroDocumento', ' 99010001 ');
    editar('nombres', ' Paciente ');
    editar('apellidos', ' Prueba ');
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PacienteForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(PacienteForm);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify({ ignoreCancelled: true });
  });

  it('should reject blank and whitespace-only required values without sending a request', () => {
    editar('nombres', '   ');
    enviar();
    expect(fixture.nativeElement.textContent).toContain('Este campo es obligatorio.');
    http.expectNone((r) => r.method === 'POST');
    expect(navegar).not.toHaveBeenCalled();
  });

  it('should trim a typed create request, keep optional data null and block double submits', () => {
    completar();
    enviar();
    enviar();
    const req = http.expectOne((r) => r.method === 'POST');
    expect(Object.keys(req.request.body)).toEqual(['persona']);
    expect(req.request.body.persona).toEqual({
      tipoDocumento: 'DNI',
      numeroDocumento: '99010001',
      nombres: 'Paciente',
      apellidos: 'Prueba',
      fechaNacimiento: null,
      sexo: null,
      telefono: null,
      direccion: null,
    });
    req.flush({ ...paciente, estado: 1 });
    fixture.detectChanges();
    expect(TestBed.inject(AvisoService).actual()?.tipo).toBe('exito');
    expect(navegar).toHaveBeenCalledWith(['/atencion-paciente-consulta/pacientes'], { queryParams: { estado: 1 } });
    expect(fixture.componentInstance.puedeSalir()).toBe(true);
  });

  it('should load and update the selected record without changing its state or audit user', () => {
    fixture.componentRef.setInput('id', '7');
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/pacientes/7')).flush(paciente);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Editar paciente');
    editar('nombres', 'Nombre actualizado');
    enviar();
    const req = http.expectOne((r) => r.method === 'PUT');
    expect(req.request.url).toMatch(/\/pacientes\/7$/);
    expect(req.request.body.persona.nombres).toBe('Nombre actualizado');
    expect(req.request.body.estado).toBeUndefined();
    expect(req.request.body.idUsuario).toBeUndefined();
    req.flush({ ...paciente, persona: { ...paciente.persona, nombres: 'Nombre actualizado' } });
  });

  it('should reject invalid route identifiers without a backend call', () => {
    fixture.componentRef.setInput('id', '7.2');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'El identificador del paciente no es válido',
    );
    expect(
      (fixture.nativeElement.querySelector('.save-button') as HTMLButtonElement).disabled,
    ).toBe(true);
    http.expectNone((r) => r.method === 'GET');
  });

  it('should retain the values and display a backend field validation error', () => {
    completar();
    enviar();
    http
      .expectOne((r) => r.method === 'POST')
      .flush(
        {
          message: 'Datos inválidos',
          validationErrors: {
            'persona.numeroDocumento': 'Documento inválido para el tipo seleccionado',
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Documento inválido para el tipo seleccionado',
    );
    expect(fixture.nativeElement.querySelector('#nombres').value).toBe('Paciente');
    expect(
      (fixture.nativeElement.querySelector('.save-button') as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('should show the duplicate-document action and keep the entered data', () => {
    completar();
    enviar();
    http
      .expectOne((r) => r.method === 'POST')
      .flush(
        { message: 'El documento ya está registrado; seleccione la persona existente' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ver paciente existente');
    expect(fixture.nativeElement.querySelector('#numeroDocumento').value).toBe('99010001');
    expect(navegar).not.toHaveBeenCalled();
  });

  it('should confirm discarding changes and preserve the form when cancelled', async () => {
    editar('nombres', 'Sin guardar');
    const decision = fixture.componentInstance.puedeSalir();
    const avisos = TestBed.inject(AvisoService);
    expect(avisos.actual()?.titulo).toBe('¿Descartar los cambios?');
    avisos.cerrar();
    expect(await decision).toBe(false);
    expect(fixture.nativeElement.querySelector('#nombres').value).toBe('Sin guardar');
    const segunda = fixture.componentInstance.puedeSalir();
    avisos.ejecutar(avisos.actual()!.acciones![0]);
    expect(await segunda).toBe(true);
  });
});
