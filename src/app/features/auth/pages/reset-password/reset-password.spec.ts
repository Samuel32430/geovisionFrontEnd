import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ResetPassword } from './reset-password';

describe('ResetPassword', () => {
  let fixture: ComponentFixture<ResetPassword>;
  let http: HttpTestingController;

  const configurarModulo = async (tokenParam: string | null = 'token-valido-123') => {
    await TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(tokenParam ? { token: tokenParam } : {}),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPassword);
    http = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('muestra estado no valido si no se pasa token por la URL', async () => {
    await configurarModulo(null);
    fixture.detectChanges();

    http.expectNone((r) => r.url.includes('/auth/validar-token'));
    expect(fixture.nativeElement.textContent).toContain('Enlace no válido');
    expect(fixture.nativeElement.textContent).toContain('No se proporcionó un token de recuperación válido');
  });

  it('muestra estado no valido si el backend responde que el token expiro', async () => {
    await configurarModulo('token-expirado');
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url.endsWith('/auth/validar-token'));
    expect(req.request.params.get('token')).toBe('token-expirado');
    req.flush({ valido: false });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Enlace no válido');
    expect(fixture.nativeElement.textContent).toContain('El enlace de recuperación es inválido o ha expirado');
  });

  it('permite restablecer la contrasena cuando el token es valido y las contrasenas coinciden', async () => {
    await configurarModulo('token-ok');
    fixture.detectChanges();

    const valReq = http.expectOne((r) => r.url.endsWith('/auth/validar-token'));
    valReq.flush({ valido: true });
    fixture.detectChanges();

    // Rellenar formulario
    const nuevoInput = fixture.nativeElement.querySelector('#nuevoPassword') as HTMLInputElement;
    const confInput = fixture.nativeElement.querySelector('#confirmarPassword') as HTMLInputElement;

    nuevoInput.value = 'MiNuevaClave123!';
    nuevoInput.dispatchEvent(new Event('input'));

    confInput.value = 'MiNuevaClave123!';
    confInput.dispatchEvent(new Event('input'));

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const resetReq = http.expectOne((r) => r.url.endsWith('/auth/reset-password'));
    expect(resetReq.request.method).toBe('POST');
    expect(resetReq.request.body).toEqual({
      token: 'token-ok',
      nuevoPassword: 'MiNuevaClave123!',
      confirmarPassword: 'MiNuevaClave123!',
    });

    resetReq.flush({ mensaje: 'Contraseña restablecida exitosamente' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('¡Contraseña restablecida!');
  });

  it('valida que las contrasenas coincidan antes de enviar', async () => {
    await configurarModulo('token-ok');
    fixture.detectChanges();

    const valReq = http.expectOne((r) => r.url.endsWith('/auth/validar-token'));
    valReq.flush({ valido: true });
    fixture.detectChanges();

    const nuevoInput = fixture.nativeElement.querySelector('#nuevoPassword') as HTMLInputElement;
    const confInput = fixture.nativeElement.querySelector('#confirmarPassword') as HTMLInputElement;

    nuevoInput.value = 'MiNuevaClave123!';
    nuevoInput.dispatchEvent(new Event('input'));

    confInput.value = 'OtraClaveDistinta!';
    confInput.dispatchEvent(new Event('input'));

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    http.expectNone((r) => r.url.endsWith('/auth/reset-password'));
    expect(fixture.nativeElement.textContent).toContain('Las contraseñas no coinciden');
  });
});
