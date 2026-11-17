import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { PacienteService } from './paciente';

describe('PacienteService', () => {
  let http: HttpTestingController;
  let servicio: PacienteService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(PacienteService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('should obtain global counts using two existing state-filtered queries', () => {
    const resultado = vi.fn();
    servicio.resumen().subscribe(resultado);
    const solicitudes = http.match((r) => r.url.endsWith('/pacientes'));
    expect(solicitudes).toHaveLength(2);
    for (const solicitud of solicitudes) {
      expect(solicitud.request.params.get('size')).toBe('1');
      expect(solicitud.request.params.get('page')).toBe('0');
      expect(solicitud.request.params.has('termino')).toBe(false);
      solicitud.flush({
        content: [],
        totalElements: solicitud.request.params.get('estado') === '1' ? 12 : 3,
      });
    }
    expect(resultado).toHaveBeenCalledWith({ activos: 12, inactivos: 3, total: 15 });
  });
  it('should use the backend query names and a numeric state', () => {
    servicio.listar({ termino: '  Prueba  ', estado: 0, page: 2, size: 20 }).subscribe();
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/pacientes`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['estado', 'page', 'size', 'termino']);
    expect(req.request.params.get('estado')).toBe('0');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('termino')).toBe('Prueba');
    req.flush({ content: [] });
  });
  it('should omit an empty search and use PATCH for state changes', () => {
    servicio.listar({ termino: ' ', estado: 1, page: 0, size: 10 }).subscribe();
    const listado = http.expectOne((r) => r.url.endsWith('/pacientes'));
    expect(listado.request.params.has('termino')).toBe(false);
    listado.flush({ content: [] });
    servicio.cambiarEstado(7, 0).subscribe();
    const estado = http.expectOne(`${environment.apiUrl}/pacientes/7/estado`);
    expect(estado.request.method).toBe('PATCH');
    expect(estado.request.body).toEqual({ estado: 0 });
    estado.flush({ id: 7, persona: { id: 7 }, estado: 0 });
  });
});
