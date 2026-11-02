import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { forkJoin, map, timeout } from 'rxjs';
import { PacienteRequest } from '../models/paciente-request.model';
import {
  ConsultaPacientes,
  EstadoPaciente,
  Paciente,
  PaginaPacientes,
} from '../models/paciente.model';

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
    return this.http.get<PaginaPacientes>(this.url, { params }).pipe(timeout(15000));
  }

  cambiarEstado(idPersona: number, estado: EstadoPaciente) {
    return this.http.patch<Paciente>(`${this.url}/${idPersona}/estado`, { estado });
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
    return this.http.get<Paciente>(`${this.url}/${id}`).pipe(timeout(15000));
  }

  obtenerPorDocumento(documento: string) {
    return this.http
      .get<Paciente>(`${this.url}/documento/${encodeURIComponent(documento.trim())}`)
      .pipe(timeout(15000));
  }

  crear(request: PacienteRequest) {
    return this.http.post<Paciente>(this.url, request);
  }

  actualizar(id: number, request: PacienteRequest) {
    return this.http.put<Paciente>(`${this.url}/${id}`, request);
  }
}
