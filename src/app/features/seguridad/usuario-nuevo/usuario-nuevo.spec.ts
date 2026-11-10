import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { UsuarioNuevo } from './usuario-nuevo';
import { AvisoService } from '../../../shared/aviso-service';
import { PersonaParaUsuario } from '../seguridad.model';

const persona: PersonaParaUsuario = {
  idPersona: 20,
  nombres: 'Ana',
  apellidos: 'Demo',
  nombreCompleto: 'Ana Demo',
  tipoDocumento: 'DNI',
  numeroDocumento: '90000001',
  tieneUsuario: false,
  idUsuario: null,
  nombreUsuario: null,
  estadoUsuario: null,
  esEmpleado: true,
  empleadoActivo: true,
};
const pagina = (content: PersonaParaUsuario[]) => ({
  content,
  totalElements: content.length,
  number: 0,
  size: 5,
  totalPages: content.length ? 1 : 0,
  first: true,
  last: true,
  empty: !content.length,
});

describe('Nuevo usuario: selección de persona y alta conjunta', () => {
  let http: HttpTestingController;
  let avisos: { confirmar: ReturnType<typeof vi.fn>; abrir: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    avisos = { confirmar: vi.fn().mockResolvedValue(false), abrir: vi.fn() };
    TestBed.configureTestingModule({
      imports: [UsuarioNuevo],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AvisoService, useValue: avisos },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => http.verify());

  function abrir(personas = [persona]) {
    const f = TestBed.createComponent(UsuarioNuevo);
    f.detectChanges();
    http
      .expectOne((r) => r.url.endsWith('/roles'))
      .flush([{ id: 3, nombre: 'RECEPCIONISTA', permisos: [] }]);
    http
      .expectOne((r) => r.url.endsWith('/usuarios/personas') && r.params.get('size') === '5')
      .flush(pagina(personas));
    f.detectChanges();
    return f;
  }
  function input(f: ReturnType<typeof abrir>, nombre: string, valor: string) {
    const el = f.nativeElement.querySelector(`[formControlName="${nombre}"]`) as HTMLInputElement;
    el.value = valor;
    el.dispatchEvent(new Event('input'));
    f.detectChanges();
  }
  function acceso(f: ReturnType<typeof abrir>) {
    input(f, 'nombre', 'ana.demo');
    input(f, 'correo', 'ana@example.com');
    input(f, 'password', 'ClaveFicticia123!');
    input(f, 'confirmacion', 'ClaveFicticia123!');
  }
  function elegir(f: ReturnType<typeof abrir>) {
    (
      f.nativeElement.querySelector(
        'button[aria-label="Seleccionar a Ana Demo"]',
      ) as HTMLButtonElement
    ).click();
    f.detectChanges();
  }
  function nueva(f: ReturnType<typeof abrir>) {
    const boton = [...f.nativeElement.querySelectorAll('button')].find((b: any) =>
      b.textContent.includes('Registrar nuevo empleado'),
    ) as HTMLButtonElement;
    boton.click();
    f.detectChanges();
    input(f, 'numeroDocumento', '90000001');
    input(f, 'nombres', ' Ana ');
    input(f, 'apellidos', ' Demo ');
    const fecha = f.nativeElement.querySelector(
      'input[type=date]:not([formControlName])',
    ) as HTMLInputElement;
    fecha.value = '2026-01-01';
    fecha.dispatchEvent(new Event('input'));
  }
  function enviar(f: ReturnType<typeof abrir>) {
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    f.detectChanges();
  }

  it('asocia la persona existente y bloquea el doble envío sin enviar datos personales ni contraseña de confirmación', () => {
    const f = abrir();
    elegir(f);
    acceso(f);
    enviar(f);
    enviar(f);
    expect(f.componentInstance.puedeSalir()).toBe(false);
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/usuarios'));
    expect(req.request.body).toEqual({
      nombre: 'ana.demo',
      correo: 'ana@example.com',
      password: 'ClaveFicticia123!',
      estado: 1,
      rolesIds: [],
      idPersona: 20,
    });
    req.flush({ id: 7, roles: [] });
    f.detectChanges();
    expect(f.componentInstance.puedeSalir()).toBe(true);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/seguridad/usuarios']);
  });
  it('registra persona y cuenta en un único POST con opcionales vacíos como null', () => {
    const f = abrir([]);
    nueva(f);
    acceso(f);
    (f.nativeElement.querySelector('.new-user-roles input') as HTMLInputElement).click();
    enviar(f);
    const req = http.expectOne((r) => r.url.endsWith('/usuarios/con-persona'));
    expect(req.request.body.persona).toEqual({
      nombres: 'Ana',
      apellidos: 'Demo',
      tipoDocumento: 'DNI',
      numeroDocumento: '90000001',
      fechaNacimiento: null,
      sexo: null,
      telefono: null,
      direccion: null,
    });
    expect(req.request.body.usuario.rolesIds).toEqual([3]);
    expect(req.request.body.empleado).toEqual({ fechaContrato: '2026-01-01' });
    req.flush({ id: 7, roles: [] });
  });
  it('ofrece editar una cuenta existente incluso inactiva y no permite seleccionarla para otra alta', () => {
    const f = abrir([
      { ...persona, tieneUsuario: true, idUsuario: 9, nombreUsuario: 'ana.demo', estadoUsuario: 0 },
    ]);
    expect(f.nativeElement.textContent).toContain('Cuenta inactiva');
    expect(f.nativeElement.querySelector('a[href="/seguridad/usuarios/9/editar"]')).not.toBeNull();
    expect(f.nativeElement.querySelector('button[aria-label="Seleccionar a Ana Demo"]')).toBeNull();
    http.expectNone((r) => r.method === 'POST');
  });
  it('conserva datos y selección de roles tras un conflicto sin reintentar automáticamente', () => {
    const f = abrir();
    elegir(f);
    acceso(f);
    enviar(f);
    http
      .expectOne((r) => r.method === 'POST')
      .flush({ message: 'La persona ya tiene cuenta' }, { status: 409, statusText: 'Conflict' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('La persona ya tiene cuenta');
    expect(
      (f.nativeElement.querySelector('input[formControlName=password]') as HTMLInputElement).value,
    ).toBe('ClaveFicticia123!');
    expect(
      (f.nativeElement.querySelector('input[formControlName=nombre]') as HTMLInputElement).disabled,
    ).toBe(false);
    http.expectNone((r) => r.method === 'POST');
  });
  it('exige la fecha de contrato para crear persona, empleado y cuenta', () => {
    const f = abrir([]);
    nueva(f);
    acceso(f);
    const fecha = f.nativeElement.querySelector(
      'input[type=date]:not([formControlName])',
    ) as HTMLInputElement;
    fecha.value = '';
    fecha.dispatchEvent(new Event('input'));
    enviar(f);
    http.expectNone((r) => r.method === 'POST');
    fecha.value = '2026-01-01';
    fecha.dispatchEvent(new Event('input'));
    enviar(f);
    const req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.body.empleado).toEqual({ fechaContrato: '2026-01-01' });
    req.flush({ id: 7, roles: [] });
  });
  it('no permite seleccionar personas sin empleado activo aunque una respuesta antigua las incluya', () => {
    const f = abrir([{ ...persona, empleadoActivo: false }]);
    const boton = f.nativeElement.querySelector(
      'button[aria-label="Seleccionar a Ana Demo"]',
    ) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    boton.click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('input[formControlName=nombre]')).toBeNull();
    http.expectNone((r) => r.method === 'POST');
  });
  it('bloquea contraseñas distintas y fechas de nacimiento futuras', () => {
    const f = abrir([]);
    nueva(f);
    acceso(f);
    input(f, 'confirmacion', 'OtraClave123');
    enviar(f);
    http.expectNone((r) => r.method === 'POST');
    input(f, 'confirmacion', 'ClaveFicticia123!');
    input(f, 'fechaNacimiento', '2999-01-01');
    enviar(f);
    http.expectNone((r) => r.method === 'POST');
    expect(f.nativeElement.textContent).toContain('no sea futura');
  });
  it('cancela la búsqueda anterior cuando se solicita un nuevo criterio', () => {
    const f = TestBed.createComponent(UsuarioNuevo);
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/roles')).flush([]);
    const anterior = http.expectOne((r) => r.url.endsWith('/usuarios/personas'));
    const buscar = f.nativeElement.querySelector('input[type=search]') as HTMLInputElement;
    buscar.value = 'Ana';
    buscar.dispatchEvent(new Event('input'));
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(anterior.cancelled).toBe(true);
    http.expectOne((r) => r.params.get('termino') === 'Ana').flush(pagina([persona]));
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Ana Demo');
  });
});
