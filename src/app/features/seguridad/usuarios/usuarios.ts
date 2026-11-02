import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { SeguridadApi } from '../seguridad-api';
import { SeguridadAccess } from '../seguridad-access';
import { iniciales, Rol, Usuario } from '../seguridad.model';
import { RolesDialog } from './roles-dialog';
import { SesionService } from '../../../core/auth/sesion-service';
import { mensajeErrorHttp } from '../../../core/utils/http-error';
import { AvisoService } from '../../../shared/aviso-service';
import { Icono } from '../../../shared/components/icono/icono';

@Component({
  selector: 'app-usuarios',
  imports: [RouterLink, FormsModule, Icono, RolesDialog],
  templateUrl: './usuarios.html',
})
export class Usuarios implements OnInit {
  private readonly api = inject(SeguridadApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly avisos = inject(AvisoService);
  private readonly sesion = inject(SesionService);
  private readonly access = inject(SeguridadAccess);
  private readonly router = inject(Router);
  protected readonly datos = signal<Usuario[]>([]);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly busqueda = signal('');
  protected readonly estado = signal<number>(-1);
  protected readonly pagina = signal(0);
  protected readonly tamanio = signal(10);
  protected readonly numerosPagina = computed(() => {
    const inicio = Math.max(0, Math.min(this.pagina() - 2, this.paginas() - 5));
    return Array.from({ length: Math.min(5, this.paginas()) }, (_, i) => inicio + i);
  });
  protected cambiarTamanio(valor: string) {
    const size = Number(valor);
    if (this.ocupado() || ![5, 10, 20, 50, 100].includes(size)) return;
    this.tamanio.set(size);
    this.pagina.set(0);
  }
  protected readonly editandoRoles = signal<Usuario | null>(null);
  protected readonly errorRoles = signal<string | null>(null);
  protected readonly iniciales = iniciales;
  private readonly dialog = viewChild(RolesDialog);
  protected readonly filtrados = computed(() => {
    const termino = this.busqueda().trim().toLocaleLowerCase('es');
    return this.datos().filter(
      (u) =>
        (this.estado() === -1 || u.estado === this.estado()) &&
        [u.nombre, u.nombreCompletoPersona, u.correo, ...u.roles.map((r) => r.nombre)]
          .join(' ')
          .toLocaleLowerCase('es')
          .includes(termino),
    );
  });
  protected readonly paginas = computed(() =>
    Math.max(1, Math.ceil(this.filtrados().length / this.tamanio())),
  );
  protected readonly filas = computed(() =>
    this.filtrados().slice(
      this.pagina() * this.tamanio(),
      this.pagina() * this.tamanio() + this.tamanio(),
    ),
  );
  protected readonly desde = computed(() =>
    this.filtrados().length ? this.pagina() * this.tamanio() + 1 : 0,
  );
  protected readonly hasta = computed(() =>
    Math.min((this.pagina() + 1) * this.tamanio(), this.filtrados().length),
  );
  ngOnInit() {
    this.cargar();
  }
  protected cargar() {
    if (this.ocupado() || this.cargando()) return;
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({ usuarios: this.api.usuarios(), roles: this.api.roles() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: ({ usuarios, roles }) => {
          this.datos.set(usuarios);
          this.roles.set(roles);
          this.pagina.set(0);
        },
        error: (e: unknown) => this.error.set(mensajeErrorHttp(e)),
      });
  }
  protected buscar(valor: string) {
    this.busqueda.set(valor);
    this.pagina.set(0);
  }
  protected filtrar(valor: number) {
    this.estado.set(valor);
    this.pagina.set(0);
  }
  protected propia(u: Usuario) {
    return u.idUsuario === this.sesion.actual()?.idUsuario;
  }
  protected async cambiarEstado(u: Usuario) {
    if (this.ocupado() || this.propia(u)) return;
    this.ocupado.set(true);
    const activar = u.estado === 0;
    const confirmado = await this.avisos.confirmar({
      titulo: activar ? '¿Reactivar usuario?' : '¿Desactivar usuario?',
      mensaje: `${u.nombre}. ${activar ? 'La cuenta podrá volver a iniciar sesión.' : 'La cuenta perderá acceso al sistema. Sus registros se conservarán.'}`,
      textoConfirmar: activar ? 'Reactivar usuario' : 'Desactivar usuario',
      peligrosa: !activar,
    });
    if (this.destroyRef.destroyed) return;
    if (!confirmado) {
      this.ocupado.set(false);
      return;
    }
    this.api
      .estado(u.idUsuario, activar ? 1 : 0)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.ocupado.set(false)),
      )
      .subscribe({
        next: (usuario) => {
          this.reemplazar(usuario);
          this.avisos.abrir({
            tipo: 'exito',
            titulo: activar ? 'Usuario reactivado' : 'Usuario desactivado',
            mensaje: 'El estado se actualizó correctamente.',
          });
        },
        error: (e: unknown) =>
          this.avisos.abrir({
            tipo: 'error',
            titulo: 'No se pudo cambiar el estado',
            mensaje: mensajeErrorHttp(e),
          }),
      });
  }
  private reemplazar(u: Usuario) {
    this.datos.update((datos) =>
      datos.map((actual) => (actual.idUsuario === u.idUsuario ? u : actual)),
    );
    this.pagina.set(Math.min(this.pagina(), this.paginas() - 1));
  }
  protected abrirRoles(u: Usuario) {
    if (!this.ocupado()) {
      this.errorRoles.set(null);
      this.editandoRoles.set(u);
    }
  }
  protected guardarRoles(ids: number[]) {
    const usuario = this.editandoRoles();
    if (!usuario || this.ocupado()) return;
    this.ocupado.set(true);
    this.errorRoles.set(null);
    this.api
      .asignarRoles(usuario.idUsuario, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.reemplazar(actualizado);
          this.editandoRoles.set(null);
          if (this.propia(actualizado)) {
            this.access
              .refrescar()
              .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.ocupado.set(false)),
              )
              .subscribe({
                next: () => {
                  this.ocupado.set(false);
                  this.exitoRoles();
                  if (!this.access.permitido()) void this.router.navigate(['/inicio']);
                },
                error: () => {
                  this.sesion.limpiar();
                  void this.router.navigate(['/login']);
                  this.avisos.abrir({
                    titulo: 'Roles guardados',
                    mensaje: 'Inicia sesión nuevamente para actualizar tus accesos.',
                  });
                },
              });
          } else {
            this.ocupado.set(false);
            this.exitoRoles();
          }
        },
        error: (e: unknown) => {
          this.errorRoles.set(mensajeErrorHttp(e));
          this.ocupado.set(false);
        },
      });
  }
  private exitoRoles() {
    this.avisos.abrir({
      tipo: 'exito',
      titulo: 'Roles actualizados',
      mensaje: 'Los roles de la cuenta se guardaron correctamente.',
    });
  }
  async puedeSalir() {
    if (this.ocupado()) return false;
    return (
      !this.dialog()?.sucio() ||
      this.avisos.confirmar({
        titulo: '¿Salir sin guardar?',
        mensaje: 'Los cambios de roles se descartarán.',
        textoConfirmar: 'Salir sin guardar',
      })
    );
  }
}
