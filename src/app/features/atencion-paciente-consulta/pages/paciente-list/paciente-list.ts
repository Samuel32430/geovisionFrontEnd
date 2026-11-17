import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  defer,
  distinctUntilChanged,
  finalize,
  map,
  of,
  switchMap,
} from 'rxjs';
import { Icono } from '../../../../shared/components/icono/icono';
import { AvisoService } from '../../../../shared/aviso-service';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import {
  ConsultaPacientes,
  EstadoPaciente,
  Paciente,
  PaginaPacientes,
} from '../../models/paciente.model';
import { PacienteService } from '../../services/paciente';

@Component({
  selector: 'app-paciente-list',
  imports: [Icono, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './paciente-list.html',
  styleUrl: './paciente-list.css',
})
export class PacienteList implements OnInit {
  private readonly servicio = inject(PacienteService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly refrescarResumen = new BehaviorSubject<void>(undefined);
  protected readonly resumen = signal<{ activos: number; inactivos: number; total: number } | null>(
    null,
  );
  protected readonly errorResumen = signal(false);
  protected readonly porcentajeActivos = computed(() => {
    const datos = this.resumen();
    return datos?.total ? Math.round((datos.activos / datos.total) * 1000) / 10 : 0;
  });
  protected readonly porcentajeInactivos = computed(() => {
    const datos = this.resumen();
    return datos?.total ? Math.round((datos.inactivos / datos.total) * 1000) / 10 : 0;
  });
  protected readonly avisos = inject(AvisoService);
  private readonly consultas = new BehaviorSubject<ConsultaPacientes>({
    termino: '',
    estado: 1,
    page: 0,
    size: 10,
  });
  protected readonly consulta = signal(this.consultas.value);
  protected readonly busqueda = new FormControl('', { nonNullable: true });
  protected readonly resultado = signal<PaginaPacientes | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly total = computed(() => this.resultado()?.totalElements ?? 0);
  protected readonly desde = computed(() =>
    this.total() ? this.consulta().page * this.consulta().size + 1 : 0,
  );
  protected readonly hasta = computed(() =>
    Math.min(
      this.consulta().page * this.consulta().size + (this.resultado()?.content.length ?? 0),
      this.total(),
    ),
  );
  protected readonly paginas = computed(() => {
    const total = this.resultado()?.totalPages ?? 0;
    const inicio = Math.max(0, Math.min(this.consulta().page - 2, total - 5));
    return Array.from({ length: Math.min(5, total) }, (_, i) => inicio + i);
  });

  ngOnInit(): void {
    const termino = this.route.snapshot.queryParamMap.get('buscar')?.trim() ?? '';
    const estado = this.route.snapshot.queryParamMap.get('estado') === '0' ? 0 : 1;
    if (termino || estado === 0) {
      this.busqueda.setValue(termino, { emitEvent: false });
      const inicial = { ...this.consulta(), termino, estado: estado as EstadoPaciente };
      this.consulta.set(inicial);
      this.consultas.next(inicial);
    }
    this.refrescarResumen
      .pipe(
        switchMap(() => {
          this.resumen.set(null);
          this.errorResumen.set(false);
          return this.servicio.resumen().pipe(
            catchError(() => {
              this.errorResumen.set(true);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((datos) => this.resumen.set(datos));
    this.consultas
      .pipe(
        switchMap((consulta) =>
          defer(() => {
            this.cargando.set(true);
            this.error.set(null);
            this.resultado.set(null);
            return this.servicio.listar(consulta).pipe(
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
      .subscribe((pagina) => {
        this.resultado.set(pagina);
        if (
          pagina &&
          pagina.content.length === 0 &&
          pagina.totalElements > 0 &&
          this.consulta().page > 0
        ) {
          this.actualizar({ page: Math.max(0, pagina.totalPages - 1) });
        }
      });
    this.busqueda.valueChanges
      .pipe(
        map((valor) => valor.trim()),
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((termino) => {
        if (termino !== this.consulta().termino) this.actualizar({ termino, page: 0 });
      });
  }

  protected buscar(): void {
    const termino = this.busqueda.value.trim();
    if (termino !== this.consulta().termino) this.actualizar({ termino, page: 0 });
  }

  protected filtrar(estado: EstadoPaciente): void {
    if (!this.guardando() && estado !== this.consulta().estado)
      this.actualizar({ estado, page: 0 });
  }

  protected limpiar(): void {
    this.busqueda.setValue('', { emitEvent: false });
    this.actualizar({ termino: '', page: 0 });
  }

  protected cambiarTamanio(valor: string): void {
    const size = Number(valor);
    if ([5, 10, 20, 50, 100].includes(size) && !this.guardando())
      this.actualizar({ size, page: 0 });
  }

  protected irA(page: number): void {
    if (
      !this.cargando() &&
      !this.guardando() &&
      page >= 0 &&
      page < (this.resultado()?.totalPages ?? 0) &&
      page !== this.consulta().page
    )
      this.actualizar({ page });
  }

  protected recargar(): void {
    this.refrescarResumen.next();
    this.actualizar({});
  }

  protected iniciales(paciente: Paciente): string {
    return `${paciente.persona.nombres.charAt(0)}${paciente.persona.apellidos.charAt(0)}`.toLocaleUpperCase(
      'es',
    );
  }

  protected documento(paciente: Paciente): string {
    return paciente.persona.tipoDocumento === 'CARNET_EXTRANJERIA'
      ? 'CE'
      : paciente.persona.tipoDocumento;
  }

  protected async cambiarEstado(paciente: Paciente): Promise<void> {
    if (this.guardando() || this.cargando()) return;
    this.guardando.set(true);
    this.busqueda.disable({ emitEvent: false });
    const estado = paciente.estado === 1 ? 0 : 1;
    const accion = estado === 0 ? 'Desactivar' : 'Activar';
    const confirmado = await this.avisos.confirmar({
      titulo: `¿${accion} paciente?`,
      mensaje: `${paciente.persona.nombreCompleto || paciente.persona.nombres + ' ' + paciente.persona.apellidos}. ${estado === 0 ? 'Se conservarán sus datos e historial, pero no podrá registrar nuevas recetas mientras esté inactivo.' : 'Podrá volver a registrar exámenes y recetas.'}`,
      textoConfirmar: `${accion} paciente`,
      peligrosa: estado === 0,
    });
    if (this.destroyRef.destroyed) return;
    if (!confirmado) {
      this.guardando.set(false);
      this.busqueda.enable({ emitEvent: false });
      return;
    }
    this.servicio
      .cambiarEstado(paciente.idPersona, estado)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.guardando.set(false);
          this.busqueda.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: () => {
          this.avisos.abrir({
            tipo: 'exito',
            titulo: estado === 0 ? 'Paciente desactivado' : 'Paciente activado',
            mensaje: 'El estado se actualizó correctamente.',
          });
          this.recargar();
        },
        error: (error: unknown) =>
          this.avisos.abrir({
            tipo: 'error',
            titulo: 'No se pudo actualizar el estado',
            mensaje: mensajeErrorHttp(error),
          }),
      });
  }

  private actualizar(cambios: Partial<ConsultaPacientes>): void {
    const consulta = { ...this.consulta(), ...cambios };
    this.consulta.set(consulta);
    this.consultas.next(consulta);
  }
}
