import {
  Directive,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, startWith, switchMap } from 'rxjs';
import { crearMedida } from '../models/examen-form';
import { Paciente } from '../models/paciente.model';
import { PacienteService } from '../services/paciente';
import { RecetaService } from '../services/receta';
import { SesionService } from '../../../core/auth/sesion-service';
import { AvisoService } from '../../../shared/aviso-service';
import { mensajeErrorHttp } from '../../../core/utils/http-error';

@Directive()
export abstract class RegistroClinicoBase implements OnInit {
  protected readonly externa: boolean = false;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pacientes = inject(PacienteService);
  private readonly recetas = inject(RecetaService);
  private readonly destroy = inject(DestroyRef);
  private readonly avisos = inject(AvisoService);
  protected readonly sesion = inject(SesionService);
  private readonly recargas = new Subject<void>();
  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly guardado = signal<number | null>(null);
  protected readonly id = signal(0);
  protected readonly hoy = new Date();
  protected readonly habilitado = computed(
    () =>
      this.paciente()?.estado === 1 &&
      !!this.sesion.actual()?.idPersona &&
      !!this.sesion
        .actual()
        ?.permisos.includes(this.externa ? 'RECETAS_REGISTRAR' : 'EXAMENES_REGISTRAR'),
  );
  protected readonly medidas = new FormArray([crearMedida()]);
  protected readonly form = new FormGroup({ medidas: this.medidas });
  private confirmacion?: Promise<boolean>;
  ngOnInit(): void {
    this.recargas
      .pipe(
        startWith(undefined),
        switchMap(() => {
          const id = Number(this.route.snapshot.paramMap.get('id'));
          this.id.set(id);
          this.cargando.set(true);
          this.error.set('');
          this.paciente.set(null);
          if (!Number.isSafeInteger(id) || id <= 0) {
            this.error.set('El identificador del paciente no es válido.');
            return of(null);
          }
          return this.pacientes.obtener(id).pipe(
            catchError((err: unknown) => {
              this.error.set(mensajeErrorHttp(err));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((p) => {
        this.paciente.set(p);
        this.cargando.set(false);
      });
  }
  protected reintentar(): void {
    this.recargas.next();
  }
  protected agregar(): void {
    if (this.guardando() || this.guardado()) return;
    this.medidas.push(crearMedida('CERCA'));
    this.form.markAsDirty();
  }
  protected async eliminar(i: number): Promise<void> {
    const grupo = this.medidas.at(i);
    if (this.medidas.length <= 1 || this.guardando() || this.guardado()) return;
    if (
      grupo.dirty &&
      !(await this.avisos.confirmar({
        titulo: '¿Eliminar grupo de medidas?',
        mensaje: 'Se perderán los valores ingresados en este grupo.',
        textoConfirmar: 'Eliminar grupo',
        peligrosa: true,
      }))
    )
      return;
    if (this.destroy.destroyed || this.guardando() || this.guardado()) return;
    const indice = this.medidas.controls.indexOf(grupo);
    if (indice >= 0 && this.medidas.length > 1) {
      this.medidas.removeAt(indice);
      this.form.markAsDirty();
    }
  }
  protected guardar(): void {
    if (this.guardando() || this.guardado() || !this.habilitado()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.avisos.abrir({
        tipo: 'error',
        titulo: 'Revisa las medidas',
        mensaje: 'Completa la distancia pupilar de cada grupo y corrige los campos indicados.',
      });
      return;
    }
    const idEmpleado = this.sesion.actual()?.idPersona;
    if (!idEmpleado) return;
    const request = {
      idPaciente: this.id(),
      idEmpleado,
      esExterno: (this.externa ? 1 : 0) as 0 | 1,
      medidas: this.medidas.getRawValue().map((m) => ({
        ...m,
        observaciones: m.observaciones.trim(),
        ojoDerecho: { ...m.ojoDerecho, agudezaVisual: m.ojoDerecho.agudezaVisual.trim() },
        ojoIzquierdo: { ...m.ojoIzquierdo, agudezaVisual: m.ojoIzquierdo.agudezaVisual.trim() },
      })),
    };
    this.guardando.set(true);
    this.form.disable();
    (this.externa ? this.recetas.registrarExterna(request) : this.recetas.registrarExamen(request))
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.guardando.set(false);
          this.guardado.set(r.idReceta);
          this.form.markAsPristine();
          this.avisos.abrir({
            tipo: 'exito',
            titulo: this.externa ? 'Receta externa registrada' : 'Examen visual registrado',
            mensaje: `Se guardaron las medidas en la receta #${r.idReceta}. Puedes consultar el detalle y descargar su PDF desde el historial.`,
            acciones: [
              {
                etiqueta: 'Configurar lentes',
                estilo: 'principal',
                ejecutar: () => this.configurarLentes(),
              },
              { etiqueta: 'Ver receta', estilo: 'secundario', ejecutar: () => this.verReceta() },
            ],
          });
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.form.enable();
          this.avisos.abrir({
            tipo: 'error',
            titulo: this.externa
              ? 'No se pudo registrar la receta externa'
              : 'No se pudo registrar el examen',
            mensaje: mensajeErrorHttp(err),
          });
        },
      });
  }
  protected configurarLentes(): void {
    if (this.guardado())
      this.router.navigate([
        '/atencion-paciente-consulta/pacientes',
        this.id(),
        'recetas',
        this.guardado(),
        'lentes',
      ]);
  }
  protected verReceta(): void {
    this.router.navigate(['/atencion-paciente-consulta/pacientes', this.id(), 'historial'], {
      queryParams: { receta: this.guardado() },
    });
  }
  protected volver(): void {
    this.router.navigate(['/atencion-paciente-consulta/pacientes', this.id()]);
  }
  puedeSalir(): boolean | Promise<boolean> {
    if (this.guardando()) return false;
    if (!this.form.dirty || this.guardado()) return true;
    return (this.confirmacion ??= this.avisos
      .confirmar({
        titulo: '¿Salir sin guardar?',
        mensaje: 'Las medidas ingresadas se perderán.',
        textoConfirmar: 'Salir sin guardar',
        peligrosa: true,
      })
      .finally(() => (this.confirmacion = undefined)));
  }
  @HostListener('window:beforeunload', ['$event'])
  proteger(event: BeforeUnloadEvent): void {
    if (this.guardando() || (this.form.dirty && !this.guardado())) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
