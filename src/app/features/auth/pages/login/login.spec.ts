import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Login } from './login';
import { SesionService } from '../../../../core/auth/sesion-service';
import { loginPrueba } from '../../../../core/auth/testing/auth-test-data';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;
  const escribir = (id: string, valor: string) => {
    const control = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    control.value = valor;
    control.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const enviar = () => {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  };
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                returnUrl: '/atencion-paciente-consulta/pacientes',
              }),
            },
          },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
    TestBed.resetTestingModule();
    sessionStorage.clear();
  });

  it('should toggle the password visibility without submitting or changing its value', () => {
    escribir('password', 'ClavePrueba!');
    const input = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    const button = fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement;
    expect(input.type).toBe('password');
    button.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(input.value).toBe('ClavePrueba!');
    expect(button.getAttribute('aria-label')).toBe('Ocultar contraseña');
    button.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
    http.expectNone(() => true);
  });

  it('should reject empty credentials without an HTTP request', () => {
    enviar();
    expect(fixture.nativeElement.textContent).toContain('Ingresa tu usuario o correo');
    http.expectNone(() => true);
  });

  it('should trim the username, preserve the password, prevent duplicate requests and return to the requested page', () => {
    escribir('username', ' prueba.p01 ');
    escribir('password', ' ClavePrueba! ');
    enviar();
    enviar();
    const req = http.expectOne((r) => r.url.endsWith('/auth/login'));
    expect(req.request.body).toEqual({ username: 'prueba.p01', password: ' ClavePrueba! ' });
    expect(fixture.nativeElement.querySelector('.submit').disabled).toBe(true);
    req.flush(loginPrueba());
    fixture.detectChanges();
    expect(TestBed.inject(SesionService).token()).toBeTruthy();
    expect(navegar).toHaveBeenCalledWith('/atencion-paciente-consulta/pacientes');
    expect(fixture.nativeElement.querySelector('#password').value).toBe('');
  });

  it('should show incorrect credentials and let the user retry without navigating', () => {
    escribir('username', 'prueba.p01');
    escribir('password', 'Incorrecta!');
    enviar();
    http
      .expectOne((r) => r.url.endsWith('/auth/login'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'El usuario o la contraseña no son correctos.',
    );
    expect(fixture.nativeElement.querySelector('.submit').disabled).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
    expect(TestBed.inject(SesionService).token()).toBeNull();
  });
});
