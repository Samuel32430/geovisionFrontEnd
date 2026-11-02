import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ExamenVisual } from './examen-visual';
import { SesionService } from '../../../../core/auth/sesion-service';
import { AvisoService } from '../../../../shared/aviso-service';

const usuario = { idPersona: 2, permisos: ['EXAMENES_REGISTRAR'] };
describe('ExamenVisual', () => {
  let http: HttpTestingController;
  let permisos = usuario.permisos;
  beforeEach(() => {
    permisos = usuario.permisos;
    TestBed.configureTestingModule({
      imports: [ExamenVisual],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } },
        },
        {
          provide: SesionService,
          useValue: { actual: () => ({ ...usuario, permisos }), nombre: () => 'Profesional Demo' },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function abrir(estado = 1) {
    const f = TestBed.createComponent(ExamenVisual);
    f.detectChanges();
    http
      .expectOne((r) => r.url.endsWith('/pacientes/7'))
      .flush({
        idPersona: 7,
        estado,
        persona: { nombres: 'Ana', apellidos: 'Demo', numeroDocumento: '99010001' },
      });
    f.detectChanges();
    return f;
  }
  it('no permite registrar sin permiso o para un paciente inactivo', () => {
    permisos = [];
    const f = abrir();
    expect(f.nativeElement.textContent).toContain('EXAMENES_REGISTRAR');
    expect(f.nativeElement.querySelector('button[type=submit]').disabled).toBe(true);
  });
  it('bloquea el registro de pacientes inactivos', () => {
    const f = abrir(0);
    expect(f.nativeElement.textContent).toContain('El paciente está inactivo');
    expect(f.nativeElement.querySelector('form')).toBeNull();
  });
  it('envía ambos ojos, el paciente y el empleado de sesión una sola vez', () => {
    const f = abrir();
    const form = f.nativeElement.querySelector('form') as HTMLFormElement;
    const dp = f.nativeElement.querySelector(
      'input[formcontrolname=distanciaPupilar]',
    ) as HTMLInputElement;
    dp.value = '63';
    dp.dispatchEvent(new Event('input'));
    f.detectChanges();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const req = http.expectOne((r) => r.url.endsWith('/recetas/examen-visual'));
    expect(req.request.body).toMatchObject({
      idPaciente: 7,
      idEmpleado: 2,
      esExterno: 0,
      medidas: [
        {
          tipoMedida: 'LEJOS',
          distanciaPupilar: 63,
          ojoDerecho: { esfera: null },
          ojoIzquierdo: { esfera: null },
        },
      ],
    });
    req.flush({ idReceta: 42 });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Examen visual registrado.');
    expect(f.componentInstance.puedeSalir()).toBe(true);
  });
  it('conserva los valores y permite reintentar si el servidor rechaza el examen', () => {
    const f = abrir();
    const dp = f.nativeElement.querySelector(
      'input[formcontrolname=distanciaPupilar]',
    ) as HTMLInputElement;
    dp.value = '63';
    dp.dispatchEvent(new Event('input'));
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    http
      .expectOne((r) => r.url.endsWith('/recetas/examen-visual'))
      .flush({ message: 'Empleado no habilitado' }, { status: 403, statusText: 'Forbidden' });
    f.detectChanges();
    expect(dp.value).toBe('63');
    expect(dp.disabled).toBe(false);
    expect(TestBed.inject(AvisoService).actual()?.tipo).toBe('error');
    const confirmar = vi.spyOn(TestBed.inject(AvisoService), 'confirmar').mockResolvedValue(false);
    f.componentInstance.puedeSalir();
    expect(confirmar).toHaveBeenCalled();
  });
});
