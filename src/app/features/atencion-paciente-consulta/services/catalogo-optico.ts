import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { MaterialCristal, TratamientoCristal, Montura } from '../models/lente.model';
@Injectable({ providedIn: 'root' })
export class CatalogoOpticoService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/catalogos-opticos';
  materiales() {
    return this.http.get<MaterialCristal[]>(this.url + '/materiales-cristal').pipe(timeout(15000));
  }
  tratamientos() {
    return this.http
      .get<TratamientoCristal[]>(this.url + '/tratamientos-cristal')
      .pipe(timeout(15000));
  }
  monturas(page = 0) {
    return this.http
      .get<PaginaResponse<Montura>>(this.url + '/monturas', {
        params: new HttpParams().set('page', page).set('size', 6),
      })
      .pipe(timeout(15000));
  }
}
