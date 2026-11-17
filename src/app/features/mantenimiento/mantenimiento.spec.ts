import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { Mantenimiento } from './mantenimiento';
import { MantenimientoService } from './mantenimiento.service';
import { AvisoService } from '../../shared/aviso-service';
import { MantenimientoAccess } from './mantenimiento-access';
import { SesionService } from '../../core/auth/sesion-service';

describe('Mantenimiento de catálogos', () => {
  let fixture: ComponentFixture<Mantenimiento>;
  let pagina: Mantenimiento;
  let http: HttpTestingController;
  const categoria = { id: 1, nombre: 'Monturas', descripcion: 'Catálogo', estado: 1 };
  const respuesta = {
    content: [categoria],
    number: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
    first: true,
    last: true,
    empty: false,
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Mantenimiento],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Mantenimiento);
    pagina = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/mantenimiento/categorias')).flush(respuesta);
    fixture.detectChanges();
    await fixture.whenStable();
    const dialogo = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialogo.showModal = () => dialogo.setAttribute('open', '');
    dialogo.close = () => dialogo.removeAttribute('open');
  });
  afterEach(() => {
    http.verify();
    fixture.destroy();
  });

  it('registra una categoría con estado activo y actualiza la lista', async () => {
    pagina.abrir();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(pagina.formulario.estado).toBe(1);
    const nombre = fixture.nativeElement.querySelector('input[name="nombre"]') as HTMLInputElement;
    nombre.value = '  Accesorios  ';
    nombre.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    const formulario = fixture.debugElement.queryAll(By.directive(NgForm))[1].injector.get(NgForm);
    await pagina.guardar(formulario);
    const req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.body.nombre).toBe('Accesorios');
    expect(req.request.body.estado).toBe(1);
    req.flush({ id: 2, nombre: 'Accesorios', estado: 1 });
    http.expectOne((r) => r.method === 'GET').flush(respuesta);
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(false);
  });

  it('conserva los datos y el formulario cuando el backend rechaza un duplicado', async () => {
    pagina.abrir(categoria);
    fixture.detectChanges();
    await fixture.whenStable();
    const formulario = fixture.debugElement.queryAll(By.directive(NgForm))[1].injector.get(NgForm);
    await pagina.guardar(formulario);
    http
      .expectOne((r) => r.method === 'PUT')
      .flush(
        { message: 'Ya existe un registro de Categoría con ese nombre.' },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();
    expect(pagina.formulario.nombre).toBe('Monturas');
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Ya existe un registro de Categoría');
    expect(pagina.ocupado()).toBe(false);
  });

  it('mantiene el estado activo y muestra el motivo al rechazar dependencias', async () => {
    vi.spyOn(TestBed.inject(AvisoService), 'confirmar').mockResolvedValue(true);
    await pagina.alternar(categoria);
    const req = http.expectOne((r) => r.method === 'PUT');
    expect(req.request.body.estado).toBe(0);
    req.flush(
      { message: 'No se puede desactivar la categoría: tiene productos activos.' },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(pagina.registros()[0].estado).toBe(1);
    expect(TestBed.inject(AvisoService).actual()?.mensaje).toContain('productos activos');
  });

  it('no envía cambios cuando se cancela la confirmación', async () => {
    vi.spyOn(TestBed.inject(AvisoService), 'confirmar').mockResolvedValue(false);
    await pagina.alternar(categoria);
    http.expectNone((r) => r.method === 'PUT');
    expect(pagina.ocupado()).toBe(false);
  });

  it('envía búsqueda y paginación sin estado para materiales', () => {
    TestBed.inject(MantenimientoService)
      .listar('materiales-cristal', '  Resina  ', '1', 2)
      .subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/materiales-cristal'));
    expect(req.request.params.get('termino')).toBe('Resina');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.has('estado')).toBe(false);
    req.flush({ ...respuesta, content: [] });
  });
});

describe('Permiso de mantenimiento', () => {
  it('exige el permiso explícito incluso para un rol administrador', () => {
    let permisos: string[] = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: SesionService, useValue: { actual: () => ({ roles: ['ADMIN'], permisos }) } },
      ],
    });
    expect(TestBed.inject(MantenimientoAccess).permitido()).toBe(false);
    TestBed.resetTestingModule();
    permisos = ['MANTENIMIENTO_GESTIONAR'];
    TestBed.configureTestingModule({
      providers: [
        { provide: SesionService, useValue: { actual: () => ({ roles: [], permisos }) } },
      ],
    });
    expect(TestBed.inject(MantenimientoAccess).permitido()).toBe(true);
    TestBed.resetTestingModule();
  });
});
