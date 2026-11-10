import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { MaterialCristal, TratamientoCristal, Montura } from '../models/lente.model';
import { ConIdApi, normalizarId } from '../../../core/models/id-api';
export type MonturaApi = ConIdApi<Montura, 'idProducto'>;
export const paginaMonturas = (pagina: PaginaResponse<MonturaApi>) => ({
  ...pagina,
  content: pagina.content.map((dto) => normalizarId<Montura, 'idProducto'>(dto, 'idProducto')),
});

@Injectable({ providedIn: 'root' })
export class CatalogoOpticoService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/catalogos-opticos';
  materiales() {
    return this.http
      .get<ConIdApi<MaterialCristal, 'idMaterialCristal'>[]>(this.url + '/materiales-cristal')
      .pipe(
        timeout(15000),
        map((datos) =>
          datos.map((dto) =>
            normalizarId<MaterialCristal, 'idMaterialCristal'>(dto, 'idMaterialCristal'),
          ),
        ),
      );
  }
  tratamientos() {
    return this.http
      .get<ConIdApi<TratamientoCristal, 'idTratamientoCristal'>[]>(
        this.url + '/tratamientos-cristal',
      )
      .pipe(
        timeout(15000),
        map((datos) =>
          datos.map((dto) =>
            normalizarId<TratamientoCristal, 'idTratamientoCristal'>(dto, 'idTratamientoCristal'),
          ),
        ),
      );
  }
  monturas(page = 0) {
    return this.http
      .get<PaginaResponse<MonturaApi>>(this.url + '/monturas', {
        params: new HttpParams().set('page', page).set('size', 6),
      })
      .pipe(timeout(15000), map(paginaMonturas));
  }
}
