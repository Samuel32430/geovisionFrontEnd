import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { forkJoin, map, timeout } from 'rxjs';
import { PacienteRequest } from '../models/paciente-request.model';
import {
  ConsultaPacientes,
  EstadoPaciente,
  Paciente,
  PersonaPaciente,
} from '../models/paciente.model';

import { ConIdApi, normalizarId } from '../../../core/models/id-api';
import { PaginaResponse } from '../../../core/models/pagina-response';

type PacienteDatos = Omit<Paciente, 'persona'> & {
  persona: ConIdApi<PersonaPaciente, 'idPersona'>;
};
type PacienteApi = ConIdApi<PacienteDatos, 'idPersona'>;
const paciente = (dto: PacienteApi): Paciente => ({
  ...normalizarId<PacienteDatos, 'idPersona'>(dto, 'idPersona'),
  persona: normalizarId<PersonaPaciente, 'idPersona'>(dto.persona, 'idPersona'),
});

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/pacientes`;

  listar(consulta: ConsultaPacientes) {
    let params = new HttpParams()
      .set('estado', consulta.estado)
      .set('page', consulta.page)
      .set('size', consulta.size);
    if (consulta.termino.trim()) params = params.set('termino', consulta.termino.trim());
    return this.http.get<PaginaResponse<PacienteApi>>(this.url, { params }).pipe(
      timeout(15000),
      map((pagina) => ({ ...pagina, content: pagina.content.map(paciente) })),
    );
  }

  cambiarEstado(idPersona: number, estado: EstadoPaciente) {
    return this.http
      .patch<PacienteApi>(`${this.url}/${idPersona}/estado`, { estado })
      .pipe(map(paciente));
  }

  resumen() {
    return forkJoin({
      activos: this.listar({ termino: '', estado: 1, page: 0, size: 1 }),
      inactivos: this.listar({ termino: '', estado: 0, page: 0, size: 1 }),
    }).pipe(
      map(({ activos, inactivos }) => ({
        activos: activos.totalElements,
        inactivos: inactivos.totalElements,
        total: activos.totalElements + inactivos.totalElements,
      })),
    );
  }

  obtener(id: number) {
    return this.http.get<PacienteApi>(`${this.url}/${id}`).pipe(timeout(15000), map(paciente));
  }

  obtenerPorDocumento(documento: string) {
    return this.http
      .get<PacienteApi>(`${this.url}/documento/${encodeURIComponent(documento.trim())}`)
      .pipe(timeout(15000), map(paciente));
  }

  crear(request: PacienteRequest) {
    return this.http.post<PacienteApi>(this.url, request).pipe(map(paciente));
  }

  actualizar(id: number, request: PacienteRequest) {
    return this.http.put<PacienteApi>(`${this.url}/${id}`, request).pipe(map(paciente));
  }
}
