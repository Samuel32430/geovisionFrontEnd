import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { environment } from '../../../environments/environment';
import { SesionService } from '../../core/auth/sesion-service';
import { AvisoService } from '../../shared/aviso-service';
import {
  ConfiguracionAccess,
  configuracionGuard,
  gestionaConfiguracion,
} from './configuracion-access';
import { ConfiguracionApi } from './services/configuracion-api';
import { ConfiguracionEmpresaPage } from './pages/empresa/configuracion-empresa';
import { ConfiguracionEmpresa } from './models/configuracion.model';

const empresaEjemplo: ConfiguracionEmpresa = {
  id: 1,
  nombreLegal: 'Óptica Geo Visión S.A.C.',
  nombreComercial: 'Geo Visión',
  ruc: '20123456789',
  direccion: 'Av. Brasil 1234, Lima',
  telefono: '999123456',
  correo: 'contacto@geovision.pe',
  logo: '/imagenes/logo.png',
};

describe('Módulo de Configuración de la Empresa (CUS20)', () => {
  describe('Control de acceso y permisos (ConfiguracionAccess)', () => {
    it('permite acceso con autoridad MANTENIMIENTO_GESTIONAR', () => {
      const sesion = { roles: ['OPERADOR'], permisos: ['MANTENIMIENTO_GESTIONAR'] };
      expect(gestionaConfiguracion(sesion)).toBe(true);
    });

    it('permite acceso con rol ADMINISTRADOR o ADMIN', () => {
      expect(gestionaConfiguracion({ roles: ['ADMINISTRADOR'], permisos: [] })).toBe(true);
      expect(gestionaConfiguracion({ roles: ['ROLE_ADMIN'], permisos: [] })).toBe(true);
    });

    it('deniega acceso a usuarios sin el permiso ni rol administrador', () => {
      expect(gestionaConfiguracion({ roles: ['VENDEDOR'], permisos: ['VENTAS_REGISTRAR'] })).toBe(
        false,
      );
      expect(gestionaConfiguracion(null)).toBe(false);
    });

    it('configuracionGuard redirige a /inicio si no tiene acceso', () => {
      const mockRouter = { createUrlTree: vi.fn().mockReturnValue('/inicio') };
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          {
            provide: SesionService,
            useValue: { actual: signal(null) },
          },
          { provide: Router, useValue: mockRouter },
        ],
      });
      TestBed.runInInjectionContext(() => {
        const resultado = configuracionGuard({} as any, {} as any);
        expect(resultado).toBe('/inicio');
      });
    });
  });

  describe('Servicio de API (ConfiguracionApi)', () => {
    let api: ConfiguracionApi;
    let httpTesting: HttpTestingController;
    const url = `${environment.apiUrl}/configuracion/empresa`;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      api = TestBed.inject(ConfiguracionApi);
      httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpTesting.verify();
    });

    it('obtener retorna los datos cuando la empresa existe (200)', () => {
      let resultado: ConfiguracionEmpresa | null = null;
      api.obtener().subscribe((datos) => (resultado = datos));

      const req = httpTesting.expectOne(url);
      expect(req.request.method).toBe('GET');
      req.flush(empresaEjemplo);

      expect(resultado).toEqual(empresaEjemplo);
    });

    it('obtener retorna null cuando la empresa aún no ha sido configurada (404)', () => {
      let resultado: ConfiguracionEmpresa | null = empresaEjemplo;
      api.obtener().subscribe((datos) => (resultado = datos));

      const req = httpTesting.expectOne(url);
      expect(req.request.method).toBe('GET');
      req.flush({ message: 'No configurada' }, { status: 404, statusText: 'Not Found' });

      expect(resultado).toBeNull();
    });

    it('registrar envía POST con el body correspondiente', () => {
      let resultado: ConfiguracionEmpresa | null = null;
      api.registrar(empresaEjemplo).subscribe((datos) => (resultado = datos));

      const req = httpTesting.expectOne(url);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(empresaEjemplo);
      req.flush(empresaEjemplo);

      expect(resultado).toEqual(empresaEjemplo);
    });

    it('actualizar envía PUT con el body correspondiente', () => {
      let resultado: ConfiguracionEmpresa | null = null;
      api.actualizar(empresaEjemplo).subscribe((datos) => (resultado = datos));

      const req = httpTesting.expectOne(url);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(empresaEjemplo);
      req.flush(empresaEjemplo);

      expect(resultado).toEqual(empresaEjemplo);
    });
  });

  describe('Componente de Gestión de Configuración (ConfiguracionEmpresaPage)', () => {
    let httpTesting: HttpTestingController;
    let avisos: { confirmar: ReturnType<typeof vi.fn>; abrir: ReturnType<typeof vi.fn> };
    const url = `${environment.apiUrl}/configuracion/empresa`;

    beforeEach(async () => {
      avisos = {
        confirmar: vi.fn().mockResolvedValue(true),
        abrir: vi.fn(),
      };

      await TestBed.configureTestingModule({
        imports: [ConfiguracionEmpresaPage],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: AvisoService, useValue: avisos },
        ],
      }).compileComponents();

      httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpTesting.verify();
    });

    it('carga y muestra la ficha institucional cuando la empresa ya está configurada', () => {
      const fixture = TestBed.createComponent(ConfiguracionEmpresaPage);
      fixture.detectChanges();

      const req = httpTesting.expectOne(url);
      req.flush(empresaEjemplo);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.empresa-card')).toBeTruthy();
      expect(el.textContent).toContain('Óptica Geo Visión S.A.C.');
      expect(el.textContent).toContain('20123456789');
      expect(el.querySelector('.form-panel')).toBeFalsy();
    });

    it('muestra el formulario de registro inicial cuando no hay empresa configurada (404)', () => {
      const fixture = TestBed.createComponent(ConfiguracionEmpresaPage);
      fixture.detectChanges();

      const req = httpTesting.expectOne(url);
      req.flush({ message: 'No configurada' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.notice')).toBeTruthy();
      expect(el.textContent).toContain('Configuración inicial requerida');
      expect(el.querySelector('.form-panel')).toBeTruthy();
      expect(fixture.componentInstance.editando()).toBe(true);
    });

    it('valida que el RUC tenga exactamente 11 dígitos numéricos', () => {
      const fixture = TestBed.createComponent(ConfiguracionEmpresaPage);
      fixture.detectChanges();
      httpTesting.expectOne(url).flush(null, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.form.controls.ruc.setValue('12345');
      expect(component.form.controls.ruc.valid).toBe(false);

      component.form.controls.ruc.setValue('2012345678A');
      expect(component.form.controls.ruc.valid).toBe(false);

      component.form.controls.ruc.setValue('20123456789');
      expect(component.form.controls.ruc.valid).toBe(true);
    });

    it('permite alternar entre visualización y edición', () => {
      const fixture = TestBed.createComponent(ConfiguracionEmpresaPage);
      fixture.detectChanges();
      httpTesting.expectOne(url).flush(empresaEjemplo);
      fixture.detectChanges();

      const component = fixture.componentInstance;
      expect(component.editando()).toBe(false);

      component.iniciarEdicion();
      fixture.detectChanges();
      expect(component.editando()).toBe(true);
      expect(fixture.nativeElement.querySelector('.form-panel')).toBeTruthy();

      component.cancelarEdicion();
      fixture.detectChanges();
      expect(component.editando()).toBe(false);
      expect(fixture.nativeElement.querySelector('.empresa-card')).toBeTruthy();
    });

    it('actualiza los datos exitosamente cuando el usuario confirma', async () => {
      const fixture = TestBed.createComponent(ConfiguracionEmpresaPage);
      fixture.detectChanges();
      httpTesting.expectOne(url).flush(empresaEjemplo);
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.iniciarEdicion();
      fixture.detectChanges();

      component.form.controls.telefono.setValue(' 987654321 ');
      await component.guardar();

      expect(avisos.confirmar).toHaveBeenCalled();

      const putReq = httpTesting.expectOne(url);
      expect(putReq.request.method).toBe('PUT');
      expect(putReq.request.body.telefono).toBe('987654321');

      const datosActualizados = { ...empresaEjemplo, telefono: '987654321' };
      putReq.flush(datosActualizados);
      fixture.detectChanges();

      expect(component.editando()).toBe(false);
      expect(avisos.abrir).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'exito' }),
      );
    });

    it('no realiza la petición si el usuario cancela la confirmación', async () => {
      avisos.confirmar.mockResolvedValueOnce(false);

      const fixture = TestBed.createComponent(ConfiguracionEmpresaPage);
      fixture.detectChanges();
      httpTesting.expectOne(url).flush(empresaEjemplo);
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.iniciarEdicion();
      await component.guardar();

      httpTesting.expectNone(url);
      expect(component.guardando()).toBe(false);
    });
  });
});
