import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ConfigurarLentes } from './configurar-lentes';
import { SesionService } from '../../../../core/auth/sesion-service';

const receta = {
  idReceta: 21,
  idPaciente: 7,
  nombreCompletoPaciente: 'Ana Demo',
  numeroDocumentoPaciente: '99010001',
  esExterno: 0,
  medidas: [
    {
      idMedida: 10,
      tipoMedida: 'LEJOS',
      distanciaPupilar: 63,
      prisma: 0,
      ojoDerecho: { esfera: -1 },
      ojoIzquierdo: { esfera: -0.5 },
    },
  ],
  lentes: [],
};
describe('ConfigurarLentes', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConfigurarLentes],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '7', idReceta: '21' }) } },
        },
        {
          provide: SesionService,
          useValue: { actual: () => ({ permisos: ['RECETAS_REGISTRAR'] }) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function abrir(idPaciente = 7) {
    const f = TestBed.createComponent(ConfigurarLentes);
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/recetas/21')).flush({ ...receta, idPaciente });
    http
      .expectOne((r) => r.url.endsWith('/materiales-cristal'))
      .flush([{ idMaterialCristal: 4, nombre: 'Policarbonato' }]);
    http
      .expectOne((r) => r.url.endsWith('/tratamientos-cristal'))
      .flush([{ idTratamientoCristal: 8, nombre: 'Antirreflejo' }]);
    f.detectChanges();
    return f;
  }
  function completar(form: HTMLFormElement, subtotal = '250', medida = true) {
    const material = form.querySelector('select')!;
    material.selectedIndex = 1;
    material.dispatchEvent(new Event('change'));
    const precio = form.querySelector('input[type=number]') as HTMLInputElement;
    precio.value = subtotal;
    precio.dispatchEvent(new Event('input'));
    if (medida) (form.querySelector('input[type=checkbox]') as HTMLInputElement).click();
  }
  it('no guarda si no se selecciona una medida explícita', () => {
    const f = abrir();
    const form = f.nativeElement.querySelector('form');
    completar(form, '100', false);
    form.dispatchEvent(new Event('submit'));
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Selecciona al menos una medida');
    http.expectNone((r) => r.method === 'POST');
  });
  it('registra una sola vez el lente, admite subtotal cero y no permite salir durante el envío', () => {
    const f = abrir();
    const form = f.nativeElement.querySelector('form');
    completar(form, '0');
    form.dispatchEvent(new Event('submit'));
    form.dispatchEvent(new Event('submit'));
    expect(f.componentInstance.puedeSalir()).toBe(false);
    const req = http.expectOne((r) => r.url.endsWith('/recetas/21/lentes'));
    expect(req.request.body).toEqual({
      idReceta: 21,
      idMaterialCristal: 4,
      idProducto: null,
      subTotal: 0,
      medidasIds: [10],
      tratamientosCristalIds: [],
    });
    req.flush({ idLente: 90, subTotal: 0 });
    f.detectChanges();
    expect(form.querySelector('select').disabled).toBe(true);
    expect(f.componentInstance.puedeSalir()).toBe(true);
    expect(f.nativeElement.textContent).toContain('Lente #90');
  });
  it('conserva el primer lente registrado cuando falla el segundo', () => {
    const f = abrir();
    let form = f.nativeElement.querySelector('form');
    completar(form);
    form.dispatchEvent(new Event('submit'));
    http.expectOne((r) => r.method === 'POST').flush({ idLente: 90, subTotal: 250 });
    f.detectChanges();
    (f.nativeElement.querySelector('button.add') as HTMLButtonElement).click();
    f.detectChanges();
    form = f.nativeElement.querySelectorAll('form')[1];
    completar(form, '180');
    form.dispatchEvent(new Event('submit'));
    http
      .expectOne((r) => r.method === 'POST')
      .flush(
        { message: 'La receta ya está vinculada a una venta' },
        { status: 400, statusText: 'Bad Request' },
      );
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Lente #90');
    expect(f.nativeElement.textContent).toContain('La receta ya está vinculada a una venta');
    expect(form.querySelector('input[type=number]').value).toBe('180');
    expect(form.querySelector('select').disabled).toBe(false);
  });
  it('rechaza una receta de otro paciente', () => {
    const f = abrir(8);
    expect(f.nativeElement.textContent).toContain('La receta no pertenece a este paciente');
    expect(f.nativeElement.querySelector('form')).toBeNull();
  });
});
