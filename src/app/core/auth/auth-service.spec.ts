import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  provideRouter,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from './auth-service';
import { SesionService } from './sesion-service';
import { retornoSeguro } from './auth.model';
import { loginPrueba } from './testing/auth-test-data';
import { authGuard } from '../guards/auth-guard';

const clave = 'geovision.sesion.v1';
describe('Autenticación y sesión', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('should store only the session response after a valid login', () => {
    TestBed.inject(AuthService)
      .login({ username: 'prueba.p01', password: 'ClavePrueba!' })
      .subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/auth/login'));
    expect(req.request.body).toEqual({ username: 'prueba.p01', password: 'ClavePrueba!' });
    req.flush(loginPrueba());
    expect(TestBed.inject(SesionService).token()).toBeTruthy();
    expect(sessionStorage.getItem(clave)).not.toContain('ClavePrueba!');
    expect(TestBed.inject(SesionService).nombre()).toBe('Operador Prueba');
  });

  it('should restore a valid session and reject malformed or expired stored sessions', () => {
    sessionStorage.setItem(clave, JSON.stringify(loginPrueba()));
    const sesion = TestBed.inject(SesionService);
    expect(sesion.token()).toBeTruthy();
    expect(() => sesion.iniciar(loginPrueba(Math.floor(Date.now() / 1000) - 1))).toThrow();
    expect(() => sesion.iniciar({ token: 'invalido' })).toThrow();
    sesion.limpiar();
    expect(sessionStorage.getItem(clave)).toBeNull();
  });

  it('normalizes the backend id into the local session', () => {
    const { idUsuario, ...respuesta } = loginPrueba();
    TestBed.inject(AuthService)
      .login({ username: 'prueba.p01', password: 'ClavePrueba!' })
      .subscribe();
    http.expectOne((r) => r.url.endsWith('/auth/login')).flush({ ...respuesta, id: idUsuario });
    expect(TestBed.inject(SesionService).actual()?.idUsuario).toBe(idUsuario);
  });

  it('should discard malformed saved JSON on initialization', () => {
    sessionStorage.setItem(clave, '{no-json');
    expect(TestBed.inject(SesionService).token()).toBeNull();
    expect(sessionStorage.getItem(clave)).toBeNull();
  });

  it('should clear expired sessions and redirect to login automatically', () => {
    vi.useFakeTimers();
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const sesion = TestBed.inject(SesionService);
    sesion.iniciar(loginPrueba(Math.floor(Date.now() / 1000) + 2));
    vi.advanceTimersByTime(2100);
    expect(sesion.token()).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/login'], {
      queryParams: { expirada: '1', returnUrl: '/' },
    });
  });

  it('should clear the local session even if the logout audit request fails', () => {
    TestBed.inject(SesionService).iniciar(loginPrueba());
    TestBed.inject(AuthService).logout().subscribe();
    http
      .expectOne((r) => r.url.endsWith('/auth/logout'))
      .flush({}, { status: 500, statusText: 'Server Error' });
    expect(TestBed.inject(SesionService).token()).toBeNull();
  });

  it('should protect private routes and preserve the attempted URL', () => {
    const state = { url: '/atencion-paciente-consulta/pacientes' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, state),
    ) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toContain('returnUrl=');
    TestBed.inject(SesionService).iniciar(loginPrueba());
    expect(
      TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, state)),
    ).toBe(true);
  });

  it('should reject external, login-loop and backslash return URLs', () => {
    for (const url of [
      'https://otra.test',
      '//otra.test',
      '/\\otra.test',
      '/login',
      '/login?returnUrl=/',
    ])
      expect(retornoSeguro(url)).toBe('/inicio');
    expect(retornoSeguro('/atencion-paciente-consulta/pacientes?page=2')).toBe(
      '/atencion-paciente-consulta/pacientes?page=2',
    );
  });
});
