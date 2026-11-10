import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, timeout } from 'rxjs';
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
import { ConIdApi, normalizarId } from '../../core/models/id-api';
import { PaginaResponse } from '../../core/models/pagina-response';

type PermisoApi = ConIdApi<Permiso, 'idPermiso'>;
type RolApi = ConIdApi<Omit<Rol, 'permisos'> & { permisos: PermisoApi[] }, 'idRol'>;
type UsuarioApi = ConIdApi<Omit<Usuario, 'roles'> & { roles: RolApi[] }, 'idUsuario'>;
type PersonaApi = ConIdApi<PersonaParaUsuario, 'idPersona'>;

const permiso = (dto: PermisoApi) => normalizarId<Permiso, 'idPermiso'>(dto, 'idPermiso');
const rol = (dto: RolApi): Rol => ({
  ...normalizarId<Omit<Rol, 'permisos'> & { permisos: PermisoApi[] }, 'idRol'>(dto, 'idRol'),
  permisos: dto.permisos.map(permiso),
});
const usuario = (dto: UsuarioApi): Usuario => ({
  ...normalizarId<Omit<Usuario, 'roles'> & { roles: RolApi[] }, 'idUsuario'>(dto, 'idUsuario'),
  roles: dto.roles.map(rol),
});

@Injectable({ providedIn: 'root' })
export class SeguridadApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;
  usuarios() {
    return this.http.get<UsuarioApi[]>(`${this.url}/usuarios`).pipe(
      timeout(15000),
      map((datos) => datos.map(usuario)),
    );
  }
  usuario(id: number) {
    return this.http
      .get<UsuarioApi>(`${this.url}/usuarios/${id}`)
      .pipe(timeout(15000), map(usuario));
  }
  actualizar(id: number, datos: UsuarioCambios) {
    // Se conserva el estado actual: el DTO del servidor usa activo como valor por defecto.
    return this.http.put<UsuarioApi>(`${this.url}/usuarios/${id}`, datos).pipe(map(usuario));
  }
  estado(id: number, estado: 0 | 1) {
    return this.http
      .patch<UsuarioApi>(`${this.url}/usuarios/${id}/estado`, { estado })
      .pipe(map(usuario));
  }
  roles() {
    return this.http.get<RolApi[]>(`${this.url}/roles`).pipe(
      timeout(15000),
      map((datos) => datos.map(rol)),
    );
  }
  permisos() {
    return this.http.get<PermisoApi[]>(`${this.url}/permisos`).pipe(
      timeout(15000),
      map((datos) => datos.map(permiso)),
    );
  }
  asignarRoles(id: number, ids: number[]) {
    return this.http.put<UsuarioApi>(`${this.url}/usuarios/${id}/roles`, ids).pipe(map(usuario));
  }
  asignarPermisos(id: number, ids: number[]) {
    return this.http.put<RolApi>(`${this.url}/roles/${id}/permisos`, ids).pipe(map(rol));
  }
  perfil() {
    return this.http.get<UsuarioApi>(`${this.url}/auth/me`).pipe(timeout(15000), map(usuario));
  }
  personas(termino: string, page: number) {
    const params = new HttpParams().set('termino', termino).set('page', page).set('size', 5);
    return this.http
      .get<PaginaResponse<PersonaApi>>(`${this.url}/usuarios/personas`, { params })
      .pipe(
        timeout(15000),
        map((pagina) => ({
          ...pagina,
          content: pagina.content.map((dto) =>
            normalizarId<PersonaParaUsuario, 'idPersona'>(dto, 'idPersona'),
          ),
        })),
      );
  }
  crearUsuario(datos: UsuarioExistenteAlta) {
    return this.http.post<UsuarioApi>(`${this.url}/usuarios`, datos).pipe(map(usuario));
  }
  crearPersonaUsuario(datos: PersonaUsuarioAlta) {
    return this.http.post<UsuarioApi>(`${this.url}/usuarios/con-persona`, datos).pipe(map(usuario));
  }
}
