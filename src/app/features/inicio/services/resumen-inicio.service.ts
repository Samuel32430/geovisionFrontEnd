import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import type {
  AtencionesDelDia,
  OrdenesActivas,
  VentasDelDia,
} from '../models/resumen-inicio.model';

@Injectable({ providedIn: 'root' })
export class ResumenInicioService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/inicio';

  ventas() {
    return this.http.get<VentasDelDia>(this.url + '/ventas');
  }

  ordenes() {
    return this.http.get<OrdenesActivas>(this.url + '/ordenes');
  }

  atenciones() {
    return this.http.get<AtencionesDelDia>(this.url + '/atenciones');
  }
}
