import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MainLayout } from './main-layout';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SesionService } from '../../core/auth/sesion-service';

describe('MainLayout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SesionService,
          useValue: {
            actual: signal({
              token: 'test',
              tipoToken: 'Bearer',
              id: 1,
              idPersona: 1,
              username: 'admin',
              nombreCompleto: 'Administrador Sistema',
              correo: 'admin@geovision.pe',
              roles: ['ADMINISTRADOR'],
              permisos: ['VENTAS_REGISTRAR', 'VENTAS_LEER', 'PAGOS_GESTIONAR', 'REPORTES_VER', 'PACIENTES_LEER', 'INVENTARIO_LEER'],
              expiraEn: Date.now() + 3600000,
            }),
            nombre: signal('Administrador Sistema'),
            iniciales: signal('AS'),
            tienePermiso: () => true,
            tieneRol: () => true,
            cerrarSesion: () => {},
          },
        },
      ],
    }).compileComponents();
  });

  it('should link to the dashboard, patient module, inventario and ventas section', () => {
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('nav a'),
    ) as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/inicio',
      '/atencion-paciente-consulta',
      '/inventario',
      '/ventas/nueva',
      '/ventas/historial',
      '/ventas/pagos-pendientes',
      '/ventas/reportes',
      '/configuracion',
      '/seguridad/usuarios',
      '/seguridad/roles',
    ]);
  });

  it('should open and close the mobile navigation', () => {
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.mobile-toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    (fixture.nativeElement.querySelector('.backdrop') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
