import { CabeceraPagina } from '../../../../shared/components/cabecera-pagina/cabecera-pagina';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  defer,
  finalize,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { Icono } from '../../../../shared/components/icono/icono';
import { AvisoService } from '../../../../shared/aviso-service';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { Paciente } from '../../models/paciente.model';
import { RecetaResumen } from '../../models/receta.model';
import { PacienteService } from '../../services/paciente';
import { RecetaService } from '../../services/receta';
import { RecetasRecientes } from '../../components/recetas-recientes/recetas-recientes';
import { PacienteFicha } from '../../components/paciente-ficha/paciente-ficha';

@Component({
  selector: 'app-paciente-perfil',
  imports: [CabeceraPagina, RouterLink, Icono, RecetasRecientes, PacienteFicha],
  templateUrl: './paciente-perfil.html',
  styleUrl: './paciente-perfil.css',
})
export class PacientePerfil implements OnInit {
  readonly id = input<string>();
  private readonly ids = toObservable(this.id);
  private readonly reintentos = new BehaviorSubject<void>(undefined);
  private readonly pacientes = inject(PacienteService);
  private readonly recetas = inject(RecetaService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly avisos = inject(AvisoService);
  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly historial = signal<PaginaResponse<RecetaResumen> | null>(null);
  protected readonly cargando = signal(false);
  protected readonly cargandoRecetas = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorRecetas = signal<string | null>(null);
  protected readonly nombre = computed(() => {
    const persona = this.paciente()?.persona;
    return persona
      ? persona.nombreCompleto || `${persona.nombres} ${persona.apellidos}`.trim()
      : '';
  });
  protected readonly ultimaReceta = computed(() => this.historial()?.content[0] ?? null);
  ngOnInit(): void {
    combineLatest([this.ids, this.reintentos])
      .pipe(
        switchMap(([id]) =>
          defer(() => {
            this.paciente.set(null);
            this.historial.set(null);
            this.error.set(null);
            this.errorRecetas.set(null);
            this.cargandoRecetas.set(false);
            this.cargando.set(true);
            if (!id || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
              this.error.set(
                'El identificador del paciente no es válido. Selecciona un paciente desde el listado.',
              );
              this.cargando.set(false);
              return of(null);
            }
            return this.pacientes.obtener(Number(id)).pipe(
              tap((paciente) => {
                this.paciente.set(paciente);
                this.cargando.set(false);
                this.cargandoRecetas.set(true);
              }),
              switchMap((paciente) =>
                this.recetas.recientes(paciente.idPersona).pipe(
                  catchError((error: unknown) => {
                    this.errorRecetas.set(mensajeErrorHttp(error));
                    return of(null);
                  }),
                  finalize(() => this.cargandoRecetas.set(false)),
                ),
              ),
              catchError((error: unknown) => {
                this.error.set(mensajeErrorHttp(error));
                return of(null);
              }),
              finalize(() => this.cargando.set(false)),
            );
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((historial) => this.historial.set(historial));
  }

  protected reintentar(): void {
    if (!this.guardando()) this.reintentos.next();
  }

  protected async cambiarEstado(): Promise<void> {
    const paciente = this.paciente();
    if (!paciente || this.guardando()) return;
    this.guardando.set(true);
    const estado = paciente.estado === 1 ? 0 : 1;
    const accion = estado === 0 ? 'Desactivar' : 'Reactivar';
    const confirmado = await this.avisos.confirmar({
      titulo: `¿${accion} paciente?`,
      mensaje: `${this.nombre()}. ${estado === 0 ? 'Se conservarán sus datos e historial. No podrá registrar nuevos exámenes ni recetas mientras esté inactivo.' : 'Podrá volver a registrar exámenes y recetas.'}`,
      textoConfirmar: `${accion} paciente`,
      peligrosa: estado === 0,
    });
    if (this.destroyRef.destroyed) return;
    if (!confirmado || this.paciente()?.idPersona !== paciente.idPersona) {
      this.guardando.set(false);
      return;
    }
    this.pacientes
      .cambiarEstado(paciente.idPersona, estado)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (actualizado) => {
          if (this.paciente()?.idPersona !== actualizado.idPersona) return;
          this.paciente.set(actualizado);
          this.avisos.abrir({
            tipo: 'exito',
            titulo: estado === 0 ? 'Paciente desactivado' : 'Paciente reactivado',
            mensaje: 'El estado se actualizó correctamente. Se conserva su historial.',
          });
        },
        error: (error: unknown) => {
          if (this.paciente()?.idPersona !== paciente.idPersona) return;
          this.avisos.abrir({
            tipo: 'error',
            titulo: 'No se pudo cambiar el estado',
            mensaje: mensajeErrorHttp(error),
          });
        },
      });
  }

  private readonly router = inject(Router);
  protected abrirHistorial(receta?: number): void {
    this.router.navigate(['/atencion-paciente-consulta/pacientes', this.id(), 'historial'], {
      queryParams: receta ? { receta } : {},
    });
  }
  protected accionClinica(funcion: string): void {
    if (this.paciente()?.estado !== 1 || this.guardando()) return;
    if (funcion === 'Nuevo examen visual') {
      this.router.navigate(['/atencion-paciente-consulta/pacientes', this.id(), 'examen-visual']);
    } else if (funcion === 'Registro de receta externa') {
      this.router.navigate(['/atencion-paciente-consulta/pacientes', this.id(), 'receta-externa']);
    } else this.avisos.pendiente(funcion);
  }
}
