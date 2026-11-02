import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { onTestFinished, vi } from 'vitest';
import { SesionService } from '../../core/auth/sesion-service';
import { AvisoService } from '../../shared/aviso-service';
import { administraSeguridad, SeguridadAccess, seguridadGuard } from './seguridad-access';
import { Usuarios } from './usuarios/usuarios';
import { UsuarioForm, passwordUsuario } from './usuario-form/usuario-form';
import { Roles } from './roles/roles';
import { Rol, Usuario } from './seguridad.model';

const permiso = {
  idPermiso: 7,
  nombre: 'PACIENTES_LEER',
  modulo: 'ATENCION_PACIENTES',
  moduloDescripcion: 'Atención a Pacientes',
};
const otroPermiso = { ...permiso, idPermiso: 8, nombre: 'PACIENTES_REGISTRAR' };
const rol: Rol = { idRol: 3, nombre: 'RECEPCIONISTA', permisos: [permiso] };
const usuario: Usuario = {
  idUsuario: 5,
  idPersona: 20,
  nombre: 'ana.demo',
  correo: 'ana@example.com',
  nombreCompletoPersona: 'Ana Demo',
  estado: 0,
  estadoDescripcion: 'Inactivo',
  roles: [rol],
};

describe('Administración de seguridad', () => {
  let http: HttpTestingController;
  let ruta: { snapshot: { paramMap: ReturnType<typeof convertToParamMap> } };
  let avisos: { confirmar: ReturnType<typeof vi.fn>; abrir: ReturnType<typeof vi.fn> };
  let sesion: {
    actual: ReturnType<typeof signal<any>>;
    token: () => string;
    limpiar: ReturnType<typeof vi.fn>;
    iniciar: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    ruta = { snapshot: { paramMap: convertToParamMap({ id: '5' }) } };
    avisos = { confirmar: vi.fn().mockResolvedValue(true), abrir: vi.fn() };
    sesion = {
      actual: signal({ idUsuario: 99, roles: ['ADMINISTRADOR'], permisos: [], token: 'token' }),
      token: () => 'token',
      limpiar: vi.fn(),
      iniciar: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SesionService, useValue: sesion },
        { provide: AvisoService, useValue: avisos },
        {
          provide: ActivatedRoute,
          useValue: ruta,
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => http.verify());

  function listado(usuarios = [usuario]) {
    const f = TestBed.createComponent(Usuarios);
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/usuarios')).flush(usuarios);
    http.expectOne((r) => r.url.endsWith('/roles')).flush([rol]);
    f.detectChanges();
    return f;
  }
  function editar() {
    const f = TestBed.createComponent(UsuarioForm);
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/usuarios/5')).flush(usuario);
    f.detectChanges();
    return f;
  }
  function permisos() {
    const f = TestBed.createComponent(Roles);
    f.detectChanges();
    http
      .expectOne((r) => r.url.endsWith('/roles'))
      .flush([rol, { ...rol, idRol: 4, nombre: 'OTRO' }]);
    http.expectOne((r) => r.url.endsWith('/permisos')).flush([permiso, otroPermiso]);
    f.detectChanges();
    return f;
  }

  it('restringe el acceso por permiso administrativo o rol reconocido', () => {
    expect(administraSeguridad(null)).toBe(false);
    expect(administraSeguridad({ roles: [], permisos: ['SEGURIDAD_LEER'] })).toBe(false);
    expect(administraSeguridad({ roles: [], permisos: ['SEGURIDAD_ADMINISTRAR'] })).toBe(true);
    expect(administraSeguridad({ roles: ['ROLE_ADMIN'], permisos: [] })).toBe(true);
    sesion.actual.set({ roles: [], permisos: [] });
    const resultado = TestBed.runInInjectionContext(() => seguridadGuard({} as any, {} as any));
    expect(TestBed.inject(Router).serializeUrl(resultado as any)).toBe('/inicio');
    http.expectNone(() => true);
  });
  it('busca y pagina sobre toda la lista, incluyendo roles y correo, sin consultas adicionales', () => {
    const f = listado(
      Array.from({ length: 12 }, (_, i) => ({
        ...usuario,
        idUsuario: i + 1,
        nombre: `usuario${i}`,
      })),
    );
    expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(10);
    const size = f.nativeElement.querySelector('select[aria-label="Usuarios por página"]') as HTMLSelectElement;
    size.value = '5'; size.dispatchEvent(new Event('change')); f.detectChanges();
    expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
    (f.nativeElement.querySelector('button[aria-label="Página 3"]') as HTMLButtonElement).click(); f.detectChanges();
    expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    expect(f.nativeElement.querySelector('.pagination-info').textContent).toContain('11–12');

    const input: HTMLInputElement = f.nativeElement.querySelector('input[type=search]');
    input.value = 'usuario11';
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(f.nativeElement.textContent).toContain('usuario11');
    http.expectNone(() => true);
  });
  it('impide desactivar la cuenta propia sin realizar una petición', () => {
    const f = listado([{ ...usuario, idUsuario: 99, estado: 1 }]);
    const boton = f.nativeElement.querySelector(
      'button[aria-label="Desactivar ana.demo"]',
    ) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    boton.click();
    expect(avisos.confirmar).not.toHaveBeenCalled();
    http.expectNone((r) => r.method === 'PATCH');
  });
  it('cambia el estado solo después de confirmar y conserva la fila ante un error', async () => {
    const f = listado();
    (
      f.nativeElement.querySelector('button[aria-label="Reactivar ana.demo"]') as HTMLButtonElement
    ).click();
    await Promise.resolve();
    const req = http.expectOne((r) => r.url.endsWith('/usuarios/5/estado'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 1 });
    req.flush({ message: 'No disponible' }, { status: 500, statusText: 'Error' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Inactivo');
    expect(avisos.abrir).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'error' }));
  });
  it('mantiene inactiva la cuenta editada y no reenvía roles ni una contraseña vacía', () => {
    const f = editar();
    const nombre = f.nativeElement.querySelector(
      'input[formControlName=nombre]',
    ) as HTMLInputElement;
    nombre.value = 'ana.nueva';
    nombre.dispatchEvent(new Event('input'));
    f.detectChanges();
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    const req = http.expectOne((r) => r.method === 'PUT');
    expect(req.request.body).toEqual({
      nombre: 'ana.nueva',
      correo: 'ana@example.com',
      idPersona: 20,
      estado: 0,
    });
    req.flush({ message: 'Nombre duplicado' }, { status: 400, statusText: 'Bad Request' });
    f.detectChanges();
    expect(nombre.value).toBe('ana.nueva');
    expect(nombre.disabled).toBe(false);
    expect(f.nativeElement.textContent).toContain('Nombre duplicado');
  });
  it('rechaza contraseña con más de 72 bytes y exige confirmación coincidente', () => {
    expect(passwordUsuario(new FormControl('é'.repeat(37)))).toEqual({ password: true });
    expect(passwordUsuario(new FormControl(''))).toBeNull();
    expect(passwordUsuario(new FormControl('Clave123'))).toBeNull();
    const f = editar();
    const input = f.nativeElement.querySelector(
      'input[formControlName=password]',
    ) as HTMLInputElement;
    input.value = 'Clave123';
    input.dispatchEvent(new Event('input'));
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    f.detectChanges();
    http.expectNone((r) => r.method === 'PUT');
    expect(f.nativeElement.textContent).toContain('Las contraseñas deben coincidir');
  });
  it('bloquea envío repetido y navegación mientras se actualiza una cuenta', () => {
    const f = editar();
    const input = f.nativeElement.querySelector(
      'input[formControlName=correo]',
    ) as HTMLInputElement;
    input.value = 'nuevo@example.com';
    input.dispatchEvent(new Event('input'));
    const form = f.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    form.dispatchEvent(new Event('submit'));
    expect(f.componentInstance.puedeSalir()).toBe(false);
    const req = http.expectOne((r) => r.method === 'PUT');
    req.flush(usuario);
    f.detectChanges();
    expect(f.componentInstance.puedeSalir()).toBe(true);
  });
  it('no solicita personas ficticias ni permite enviar un registro sin selector disponible', () => {
    ruta.snapshot.paramMap = convertToParamMap({});
    const f = TestBed.createComponent(UsuarioForm);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Registro pendiente de habilitar');
    expect(f.nativeElement.querySelector('form')).toBeNull();
    http.expectNone(() => true);
  });
  it('permite seleccionar todo un módulo y cancelar el cambio de rol con modificaciones pendientes', async () => {
    const f = permisos();
    const modulo = f.nativeElement.querySelector('input[aria-label]') as HTMLInputElement;
    expect(modulo.indeterminate).toBe(true);
    modulo.click();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('2 seleccionados');
    avisos.confirmar.mockResolvedValueOnce(false);
    (f.nativeElement.querySelectorAll('.role-list button')[1] as HTMLButtonElement).click();
    await Promise.resolve();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.role-list .selected').textContent).toContain(
      'RECEPCIONISTA',
    );
    expect(f.nativeElement.textContent).toContain('2 seleccionados');
  });
  it('guarda los permisos con IDs reales y conserva la selección si el servidor rechaza el cambio', async () => {
    const f = permisos();
    (f.nativeElement.querySelector('input[aria-label]') as HTMLInputElement).click();
    f.detectChanges();
    (f.nativeElement.querySelector('button.primary') as HTMLButtonElement).click();
    await Promise.resolve();
    const req = http.expectOne((r) => r.url.endsWith('/roles/3/permisos'));
    expect(req.request.body).toEqual([7, 8]);
    expect(f.componentInstance.puedeSalir()).toBe(false);
    req.flush({ message: 'No se pudo guardar' }, { status: 500, statusText: 'Error' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('2 seleccionados');
    expect(f.nativeElement.textContent).toContain('No se pudo guardar');
  });
  it('actualiza permisos de la sesión tras una modificación sin cambiar el token', () => {
    const access = TestBed.inject(SeguridadAccess);
    access.refrescar().subscribe();
    http.expectOne((r) => r.url.endsWith('/auth/me')).flush({ ...usuario, idUsuario: 99 });
    expect(sesion.iniciar).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token',
        roles: ['RECEPCIONISTA'],
        permisos: ['PACIENTES_LEER'],
      }),
    );
  });

  it('envía la selección de roles al endpoint dedicado y conserva el diálogo si falla', async () => {
    const original = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
    onTestFinished(() => {
      if (original) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', original);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    });
    const f = listado();
    (
      f.nativeElement.querySelector(
        'button[aria-label="Asignar roles a ana.demo"]',
      ) as HTMLButtonElement
    ).click();
    f.detectChanges();
    const dialog = f.nativeElement.querySelector('dialog');
    expect(dialog.getAttribute('open')).not.toBeNull();
    (dialog.querySelector('input[type=checkbox]') as HTMLInputElement).click();
    f.detectChanges();
    avisos.confirmar.mockResolvedValueOnce(false);
    expect(await f.componentInstance.puedeSalir()).toBe(false);
    (dialog.querySelector('button.primary') as HTMLButtonElement).click();
    const req = http.expectOne((r) => r.url.endsWith('/usuarios/5/roles'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([]);
    req.flush(
      { message: 'No se puede cambiar el rol' },
      { status: 400, statusText: 'Bad Request' },
    );
    f.detectChanges();
    expect(dialog.textContent).toContain('No se puede cambiar el rol');
    expect((dialog.querySelector('input[type=checkbox]') as HTMLInputElement).checked).toBe(false);
  });
});
