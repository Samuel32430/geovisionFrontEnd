import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { RecetaService } from './receta';

describe('RecetaService', () => {
  it('should request the first three recipes through the backend history endpoint', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(RecetaService).recientes(7).subscribe();
    const req = http.expectOne(
      (r) => r.url === `${environment.apiUrl}/recetas/paciente/7/historial`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('3');
    req.flush({ content: [], totalElements: 0 });
    http.verify();
  });
});
