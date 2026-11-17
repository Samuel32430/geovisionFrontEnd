import { AvisoCerrable } from '../../../shared/aviso-cerrable';
import { Icono } from '../../../shared/components/icono/icono';
import {
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { SeguridadApi } from '../seguridad-api';
import { SeguridadAccess } from '../seguridad-access';
import { etiquetasPermisos, mismosIds, Permiso, Rol } from '../seguridad.model';
import { AvisoService } from '../../../shared/aviso-service';
import { SesionService } from '../../../core/auth/sesion-service';
import { mensajeErrorHttp } from '../../../core/utils/http-error';

@Component({ selector: 'app-roles', imports: [AvisoCerrable, Icono], templateUrl: './roles.html' })
export class Roles implements OnInit {
  private readonly api = inject(SeguridadApi);
  private readonly access = inject(SeguridadAccess);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly avisos = inject(AvisoService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly permisos = signal<Permiso[]>([]);
  protected readonly seleccionado = signal<Rol | null>(null);
  protected readonly seleccion = signal<number[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly confirmando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorGuardar = signal<string | null>(null);
  protected readonly etiquetas = etiquetasPermisos;
  protected readonly sucio = computed(
    () => !mismosIds(this.seleccionado()?.permisos.map((p) => p.idPermiso) ?? [], this.seleccion()),
  );
  protected readonly grupos = computed(() => {
    const grupos = new Map<string, { modulo: string; nombre: string; permisos: Permiso[] }>();
    for (const p of this.permisos()) {
      if (!grupos.has(p.modulo))
        grupos.set(p.modulo, {
          modulo: p.modulo,
          nombre: p.moduloDescripcion || p.modulo,
          permisos: [],
        });
      grupos.get(p.modulo)!.permisos.push(p);
    }
    return [...grupos.values()];
  });
  ngOnInit() {
    this.cargar();
  }
  protected cargar() {
    if (this.cargando() || this.guardando()) return;
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({ roles: this.api.roles(), permisos: this.api.permisos() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: ({ roles, permisos }) => {
          this.roles.set(roles);
          this.permisos.set(permisos);
          this.elegir(roles[0] ?? null);
        },
        error: (e: unknown) => this.error.set(mensajeErrorHttp(e)),
      });
  }
  private elegir(rol: Rol | null) {
    this.seleccionado.set(rol);
    this.seleccion.set(rol?.permisos.map((p) => p.idPermiso) ?? []);
    this.errorGuardar.set(null);
  }
  protected async seleccionar(rol: Rol) {
    if (this.guardando() || this.confirmando() || this.seleccionado()?.idRol === rol.idRol) return;
    this.confirmando.set(true);
    const salir = !this.sucio() || (await this.confirmarSalida());
    this.confirmando.set(false);
    if (salir && !this.destroyRef.destroyed) this.elegir(rol);
  }
  protected alternar(id: number) {
    if (this.guardando() || this.confirmando()) return;
    this.seleccion.update((ids) => (ids.includes(id) ? ids.filter((p) => p !== id) : [...ids, id]));
  }
  protected todos(permisos: Permiso[]) {
    return permisos.every((p) => this.seleccion().includes(p.idPermiso));
  }
  protected parcial(permisos: Permiso[]) {
    return !this.todos(permisos) && permisos.some((p) => this.seleccion().includes(p.idPermiso));
  }
  protected alternarModulo(permisos: Permiso[]) {
    if (this.guardando() || this.confirmando()) return;
    const ids = permisos.map((p) => p.idPermiso);
    this.seleccion.set(
      this.todos(permisos)
        ? this.seleccion().filter((id) => !ids.includes(id))
        : [...new Set([...this.seleccion(), ...ids])],
    );
  }
  protected async descartar() {
    if (this.guardando() || this.confirmando() || !this.sucio()) return;
    this.confirmando.set(true);
    const salir = await this.confirmarSalida();
    this.confirmando.set(false);
    if (salir && !this.destroyRef.destroyed) this.elegir(this.seleccionado());
  }
  protected async guardar() {
    const rol = this.seleccionado();
    if (!rol || !this.sucio() || this.guardando() || this.confirmando()) return;
    this.confirmando.set(true);
    const confirmado = await this.avisos.confirmar({
      titulo: '¿Guardar permisos del rol?',
      mensaje: `Los cambios de ${rol.nombre} afectarán a todas las cuentas que tengan este rol.${!this.seleccion().length ? ' El rol quedará sin permisos asignados.' : ''}`,
      textoConfirmar: 'Guardar permisos',
    });
    this.confirmando.set(false);
    if (!confirmado || this.destroyRef.destroyed) return;
    this.guardando.set(true);
    this.errorGuardar.set(null);
    this.api
      .asignarPermisos(rol.idRol, this.seleccion())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.roles.update((roles) =>
            roles.map((r) => (r.idRol === actualizado.idRol ? actualizado : r)),
          );
          this.elegir(actualizado);
          this.access
            .refrescar()
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              finalize(() => this.guardando.set(false)),
            )
            .subscribe({
              next: () => {
                this.guardando.set(false);
                this.avisos.abrir({
                  tipo: 'exito',
                  titulo: 'Permisos guardados',
                  mensaje: 'La configuración del rol se actualizó correctamente.',
                });
                if (!this.access.permitido()) void this.router.navigate(['/inicio']);
              },
              error: () => {
                this.sesion.limpiar();
                void this.router.navigate(['/login']);
                this.avisos.abrir({
                  titulo: 'Permisos guardados',
                  mensaje: 'Inicia sesión nuevamente para actualizar tus accesos.',
                });
              },
            });
        },
        error: (e: unknown) => {
          this.errorGuardar.set(mensajeErrorHttp(e));
          this.guardando.set(false);
        },
      });
  }
  private confirmarSalida() {
    return this.avisos.confirmar({
      titulo: '¿Descartar cambios de permisos?',
      mensaje: 'La selección de permisos no se ha guardado.',
      textoConfirmar: 'Descartar cambios',
    });
  }
  puedeSalir(): boolean | Promise<boolean> {
    return this.guardando() || this.confirmando() ? false : !this.sucio() || this.confirmarSalida();
  }
  @HostListener('window:beforeunload', ['$event'])
  proteger(event: BeforeUnloadEvent) {
    if (this.sucio() || this.guardando()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
