import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth-interceptor';
import { SesionService } from '../auth/sesion-service';
import { loginPrueba } from '../auth/testing/auth-test-data';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    TestBed.inject(SesionService).iniciar(loginPrueba());
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    sessionStorage.clear();
  });
  it('should attach the bearer token only to the configured API, excluding login', () => {
    const token = TestBed.inject(SesionService).token();
    for (const url of [
      `${environment.apiUrl}/pacientes`,
      `${environment.apiUrl}/auth/login`,
      'https://external.invalid/api',
      `${environment.apiUrl}-otro/pacientes`,
    ]) {
      client.get(url).subscribe();
      const req = http.expectOne(url);
      expect(req.request.headers.get('Authorization')).toBe(
        url === `${environment.apiUrl}/pacientes` ? `Bearer ${token}` : null,
      );
      req.flush({});
    }
  });
  it('should keep the session on 403 and incorrect-login 401, but clear it on protected 401', () => {
    const sesion = TestBed.inject(SesionService);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    for (const [url, status] of [
      [`${environment.apiUrl}/pacientes`, 403],
      [`${environment.apiUrl}/auth/login`, 401],
    ] as const) {
      client.get(url).subscribe({ error: () => undefined });
      http.expectOne(url).flush({}, { status, statusText: 'Denied' });
      expect(sesion.token()).toBeTruthy();
    }
    client.get(`${environment.apiUrl}/pacientes`).subscribe({ error: () => undefined });
    http
      .expectOne((r) => r.url.endsWith('/pacientes'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(sesion.token()).toBeNull();
    expect(navegar).toHaveBeenCalled();
  });
  it('should not let a stale 401 discard a newer session', () => {
    client.get(`${environment.apiUrl}/pacientes`).subscribe({ error: () => undefined });
    const anterior = http.expectOne((r) => r.url.endsWith('/pacientes'));
    const nueva = loginPrueba(Math.floor(Date.now() / 1000) + 7200);
    TestBed.inject(SesionService).iniciar(nueva);
    anterior.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(TestBed.inject(SesionService).token()).toBe(nueva.token);
  });
});
