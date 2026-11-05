import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from '../../../app.routes';
import { SesionService } from '../../../core/auth/sesion-service';

describe('Página no encontrada', () => {
  const actual = signal<{ roles: string[]; permisos: string[] } | null>(null);
  beforeEach(() => {
    actual.set({ roles: [], permisos: [] });
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SesionService,
          useValue: {
            actual,
            token: () => (actual() ? 'sesion-prueba' : null),
            nombre: () => 'Cuenta Demo',
            iniciales: () => 'CD',
          },
        },
      ],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('muestra el 404 dentro del layout para una ruta desconocida y conserva la URL', async () => {
    const h = await RouterTestingHarness.create('/pagina-inexistente');
    expect(h.routeNativeElement?.querySelector('app-no-encontrado')).not.toBeNull();
    expect(h.routeNativeElement?.querySelector('#sidebar')).not.toBeNull();
    expect(h.routeNativeElement?.textContent).toContain('Esta página está fuera de foco');
    expect(TestBed.inject(Router).url).toBe('/pagina-inexistente');
    expect(document.title).toBe('Página no encontrada | Geo Vision');
  });
  it('resuelve también rutas inexistentes dentro de módulos lazy', async () => {
    actual.set({ roles: ['ADMINISTRADOR'], permisos: ['PACIENTES_LEER'] });
    const h = await RouterTestingHarness.create('/atencion-paciente-consulta/no-existe');
    expect(h.routeNativeElement?.querySelector('app-no-encontrado')).not.toBeNull();
    await h.navigateByUrl('/seguridad/usuarios/ruta/no-existe');
    expect(h.routeNativeElement?.querySelector('app-no-encontrado')).not.toBeNull();
  });
  it('ofrece solo accesos implementados para los permisos de la sesión', async () => {
    const h = await RouterTestingHarness.create('/no-existe');
    expect(h.routeNativeElement?.querySelectorAll('.shortcut').length).toBe(1);
    actual.set({ roles: ['ADMINISTRADOR'], permisos: ['PACIENTES_LEER'] });
    h.detectChanges();
    const page = h.routeNativeElement?.querySelector('.error-page');
    expect(page?.querySelector('a[href="/seguridad/usuarios"]')).not.toBeNull();
    expect(page?.querySelector('a[href="/atencion-paciente-consulta/pacientes"]')).not.toBeNull();
    expect(page?.querySelectorAll('.shortcut').length).toBe(3);
  });
  it('mantiene la protección de sesión y envía al login si no está autenticado', async () => {
    actual.set(null);
    const h = await RouterTestingHarness.create('/no-existe');
    expect(TestBed.inject(Router).url).toContain('/login?returnUrl=');
    expect(h.routeNativeElement?.querySelector('app-no-encontrado')).toBeNull();
  });
});
