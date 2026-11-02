import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CabeceraPagina } from '../../../../shared/components/cabecera-pagina/cabecera-pagina';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, combineLatest, of, startWith, switchMap, tap } from 'rxjs';
import { PacienteService } from '../../services/paciente';
import { RecetaService } from '../../services/receta';
import { RecetaDetalle, RecetaResumen } from '../../models/receta.model';
import { Paciente } from '../../models/paciente.model';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import { AvisoService } from '../../../../shared/aviso-service';

@Component({
  selector: 'app-paciente-historial',
  imports: [RouterLink, DatePipe, DecimalPipe, CabeceraPagina],
  templateUrl: './paciente-historial.html',
  styleUrl: './paciente-historial.css',
})
export class PacienteHistorial implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pacientes = inject(PacienteService);
  private readonly recetas = inject(RecetaService);
  private readonly avisos = inject(AvisoService);
  private readonly destroy = inject(DestroyRef);
  private readonly paginas = new Subject<number>();
  private readonly seleccion = new Subject<number | null>();
  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly resultado = signal<PaginaResponse<RecetaResumen> | null>(null);
  protected readonly detalle = signal<RecetaDetalle | null>(null);
  protected readonly seleccionado = signal<number | null>(null);
  protected readonly cargando = signal(true);
  protected readonly cargandoDetalle = signal(false);
  protected readonly descargando = signal(false);
  protected readonly error = signal('');
  protected readonly errorDetalle = signal('');
  protected readonly pacienteId = signal(0);
  private pagina = 0;

  ngOnInit(): void {
    this.seleccion
      .pipe(
        switchMap((id) => {
          this.detalle.set(null);
          this.errorDetalle.set('');
          this.seleccionado.set(id);
          this.cargandoDetalle.set(id !== null);
          if (id === null) return of(null);
          return this.recetas.obtener(id).pipe(
            catchError((err: unknown) => {
              this.errorDetalle.set(mensajeErrorHttp(err));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((detalle) => {
        this.cargandoDetalle.set(false);
        if (detalle && detalle.idPaciente !== this.pacienteId()) {
          this.errorDetalle.set('La receta no pertenece a este paciente.');
          return;
        }
        this.detalle.set(detalle);
      });
    combineLatest([this.route.paramMap, this.paginas.pipe(startWith(0))])
      .pipe(
        switchMap(([params, page]) => {
          const id = Number(params.get('id'));
          const cambio = id !== this.pacienteId();
          this.pagina = cambio ? 0 : page;
          this.pacienteId.set(id);
          this.error.set('');
          this.cargando.set(true);
          this.resultado.set(null);
          this.seleccion.next(null);
          if (cambio) this.paciente.set(null);
          if (!Number.isSafeInteger(id) || id <= 0) {
            this.error.set('El identificador del paciente no es válido.');
            return of(null);
          }
          return this.pacientes.obtener(id).pipe(
            tap((p) => this.paciente.set(p)),
            switchMap(() => this.recetas.historial(id, this.pagina)),
            catchError((err: unknown) => {
              this.error.set(mensajeErrorHttp(err));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((datos) => {
        this.cargando.set(false);
        this.resultado.set(datos);
        const consulta = Number(this.route.snapshot.queryParamMap.get('receta'));
        const id =
          this.pagina === 0 && Number.isSafeInteger(consulta) && consulta > 0
            ? consulta
            : datos?.content[0]?.idReceta;
        if (datos && id) this.seleccion.next(id);
      });
  }
  protected cargar(page = this.pagina): void {
    this.paginas.next(page);
  }
  protected seleccionar(id: number): void {
    this.seleccion.next(id);
  }
  protected descargar(): void {
    const receta = this.detalle();
    if (!receta || this.descargando()) return;
    this.descargando.set(true);
    this.recetas
      .pdf(receta.idReceta)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (blob) => {
          this.descargando.set(false);
          const url = URL.createObjectURL(blob);
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = `receta-${receta.idReceta}.pdf`;
          enlace.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: () => {
          this.descargando.set(false);
          this.avisos.abrir({
            tipo: 'error',
            titulo: 'No se pudo descargar la receta',
            mensaje: 'Comprueba tu conexión y tus permisos e inténtalo de nuevo.',
          });
        },
      });
  }
}
