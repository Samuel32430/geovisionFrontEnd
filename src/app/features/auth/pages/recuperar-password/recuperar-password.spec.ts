import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RecuperarPassword } from './recuperar-password';

describe('RecuperarPassword', () => {
  let fixture: ComponentFixture<RecuperarPassword>;
  let http: HttpTestingController;

  const escribirCorreo = (valor: string) => {
    const control = fixture.nativeElement.querySelector('#correo') as HTMLInputElement;
    control.value = valor;
    control.dispatchEvent(new Event('input'));
  };

  const enviarFormulario = () => {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecuperarPassword],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RecuperarPassword);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('no envia la peticion si el campo correo esta vacio o es invalido', () => {
    escribirCorreo('correo-no-valido');
    enviarFormulario();

    http.expectNone((r) => r.url.includes('/auth/recuperar-password'));
    expect(fixture.nativeElement.textContent).toContain('Ingresa un formato de correo');
  });

  it('envia la solicitud de recuperacion con correo valido y muestra confirmacion', () => {
    escribirCorreo('admin@geovision.pe');
    enviarFormulario();

    const req = http.expectOne((r) => r.url.endsWith('/auth/recuperar-password'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'admin@geovision.pe' });

    req.flush({ mensaje: 'Enlace enviado con exito' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('¡Enlace enviado!');
    expect(fixture.nativeElement.textContent).toContain('admin@geovision.pe');
  });

  it('muestra mensaje amigable cuando el correo no existe (404)', () => {
    escribirCorreo('noexiste@geovision.pe');
    enviarFormulario();

    const req = http.expectOne((r) => r.url.endsWith('/auth/recuperar-password'));
    req.flush(
      { mensaje: 'No se encontró ninguna cuenta' },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se encontró ninguna cuenta registrada');
  });
});
