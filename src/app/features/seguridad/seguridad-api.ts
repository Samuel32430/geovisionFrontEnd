import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Permiso,
  Rol,
  Usuario,
  UsuarioCambios,
  PersonaParaUsuario,
  UsuarioExistenteAlta,
  PersonaUsuarioAlta,
} from './seguridad.model';
import { PaginaResponse } from '../../core/models/pagina-response';

@Injectable({ providedIn: 'root' })
export class SeguridadApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;
  usuarios() {
    return this.http.get<Usuario[]>(`${this.url}/usuarios`).pipe(timeout(15000));
  }
  usuario(id: number) {
    return this.http.get<Usuario>(`${this.url}/usuarios/${id}`).pipe(timeout(15000));
  }
  actualizar(id: number, datos: UsuarioCambios) {
    // Se conserva el estado actual: el DTO del servidor usa activo como valor por defecto.
    return this.http.put<Usuario>(`${this.url}/usuarios/${id}`, datos);
  }
  estado(id: number, estado: 0 | 1) {
    return this.http.patch<Usuario>(`${this.url}/usuarios/${id}/estado`, { estado });
  }
  roles() {
    return this.http.get<Rol[]>(`${this.url}/roles`).pipe(timeout(15000));
  }
  permisos() {
    return this.http.get<Permiso[]>(`${this.url}/permisos`).pipe(timeout(15000));
  }
  asignarRoles(id: number, ids: number[]) {
    return this.http.put<Usuario>(`${this.url}/usuarios/${id}/roles`, ids);
  }
  asignarPermisos(id: number, ids: number[]) {
    return this.http.put<Rol>(`${this.url}/roles/${id}/permisos`, ids);
  }
  perfil() {
    return this.http.get<Usuario>(`${this.url}/auth/me`).pipe(timeout(15000));
  }
  personas(termino: string, page: number) {
    const params = new HttpParams().set('termino', termino).set('page', page).set('size', 5);
    return this.http
      .get<PaginaResponse<PersonaParaUsuario>>(`${this.url}/usuarios/personas`, { params })
      .pipe(timeout(15000));
  }
  crearUsuario(datos: UsuarioExistenteAlta) {
    return this.http.post<Usuario>(`${this.url}/usuarios`, datos);
  }
  crearPersonaUsuario(datos: PersonaUsuarioAlta) {
    return this.http.post<Usuario>(`${this.url}/usuarios/con-persona`, datos);
  }
}
