import {
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, forkJoin, of, switchMap } from 'rxjs';
import { MonturaSelector } from '../../components/montura-selector/montura-selector';
import { CabeceraPagina } from '../../../../shared/components/cabecera-pagina/cabecera-pagina';
import { SesionService } from '../../../../core/auth/sesion-service';
import { AvisoService } from '../../../../shared/aviso-service';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { RecetaDetalle } from '../../models/receta.model';
import { MaterialCristal, TratamientoCristal, Montura } from '../../models/lente.model';
import { RecetaService } from '../../services/receta';
import { CatalogoOpticoService } from '../../services/catalogo-optico';
const dinero: ValidatorFn = (c) =>
  c.value === null ||
  (Number.isFinite(c.value) && Math.abs(c.value * 100 - Math.round(c.value * 100)) < 1e-5)
    ? null
    : { decimales: true };
function crearFormulario() {
  return new FormGroup({
    material: new FormControl<number | null>(null, Validators.required),
    montura: new FormControl<number | null>(null),
    subtotal: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(9999999999.99),
      dinero,
    ]),
    medidas: new FormControl<number[]>([], { nonNullable: true, validators: Validators.required }),
    tratamientos: new FormControl<number[]>([], { nonNullable: true }),
  });
}
interface Tarjeta {
  clave: number;
  form: ReturnType<typeof crearFormulario>;
  registrado: number | null;
  error: string;
}
@Component({
  selector: 'app-configurar-lentes',
  imports: [CabeceraPagina, ReactiveFormsModule, DecimalPipe, MonturaSelector],
  templateUrl: './configurar-lentes.html',
  styleUrl: './configurar-lentes.css',
})
export class ConfigurarLentes implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicio = inject(RecetaService);
  private readonly catalogos = inject(CatalogoOpticoService);
  private readonly destroy = inject(DestroyRef);
  private readonly avisos = inject(AvisoService);
  private readonly sesion = inject(SesionService);
  protected readonly pacienteId = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly recetaId = Number(this.route.snapshot.paramMap.get('idReceta'));
  protected readonly receta = signal<RecetaDetalle | null>(null);
  protected readonly materiales = signal<MaterialCristal[]>([]);
  protected readonly tratamientos = signal<TratamientoCristal[]>([]);
  protected readonly tarjetas = signal<Tarjeta[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly guardando = signal<number | null>(null);
  protected readonly permiso = computed(
    () => !!this.sesion.actual()?.permisos.includes('RECETAS_REGISTRAR'),
  );
  protected readonly monturas = signal<PaginaResponse<Montura> | null>(null);
  protected readonly cargandoMonturas = signal(false);
  protected readonly errorMonturas = signal('');
  protected readonly selector = signal<Tarjeta | null>(null);
  private readonly paginas = new Subject<number>();
  private readonly monturasConocidas = new Map<number, Montura>();
  private secuencia = 0;
  private confirmacion?: Promise<boolean>;
  ngOnInit(): void {
    this.paginas
      .pipe(
        switchMap((page) => {
          this.cargandoMonturas.set(true);
          this.errorMonturas.set('');
          this.monturas.set(null);
          return this.catalogos.monturas(page).pipe(
            catchError((e: unknown) => {
              this.errorMonturas.set(mensajeErrorHttp(e));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((p) => {
        this.cargandoMonturas.set(false);
        this.monturas.set(p);
        p?.content.forEach((m) => this.monturasConocidas.set(m.idProducto, m));
      });
    this.cargar();
  }
  protected cargar(): void {
    if (this.guardando() !== null) return;
    this.cargando.set(true);
    this.error.set('');
    if (![this.pacienteId, this.recetaId].every((n) => Number.isSafeInteger(n) && n > 0)) {
      this.error.set('Los identificadores no son válidos.');
      this.cargando.set(false);
      return;
    }
    forkJoin({
      receta: this.servicio.obtener(this.recetaId),
      materiales: this.catalogos.materiales(),
      tratamientos: this.catalogos.tratamientos(),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (datos) => {
          this.cargando.set(false);
          if (datos.receta.idPaciente !== this.pacienteId) {
            this.error.set('La receta no pertenece a este paciente.');
            return;
          }
          this.receta.set(datos.receta);
          this.materiales.set(datos.materiales);
          this.tratamientos.set(datos.tratamientos);
          if (!datos.receta.lentes?.length && !this.tarjetas().length) this.agregar(false);
        },
        error: (e: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeErrorHttp(e));
        },
      });
  }
  protected agregar(modificado = true): void {
    if (this.guardando() !== null || !this.permiso()) return;
    const tarjeta: Tarjeta = {
      clave: ++this.secuencia,
      form: crearFormulario(),
      registrado: null,
      error: '',
    };
    if (modificado) tarjeta.form.markAsDirty();
    this.tarjetas.update((a) => [...a, tarjeta]);
  }
  protected async quitar(t: Tarjeta): Promise<void> {
    if (t.registrado || this.guardando() !== null) return;
    if (
      t.form.dirty &&
      !(await this.avisos.confirmar({
        titulo: '¿Descartar configuración?',
        mensaje: 'Se perderán los datos de este lente sin guardar.',
        textoConfirmar: 'Descartar',
        peligrosa: true,
      }))
    )
      return;
    if (!this.destroy.destroyed && this.guardando() === null)
      this.tarjetas.update((a) => a.filter((x) => x !== t));
  }
  protected duplicar(t: Tarjeta): void {
    if (t.registrado || this.guardando() !== null) return;
    this.agregar();
    const nueva = this.tarjetas().at(-1)!;
    const valores = t.form.getRawValue();
    nueva.form.setValue({
      ...valores,
      medidas: [...valores.medidas],
      tratamientos: [...valores.tratamientos],
    });
  }
  protected alternar(t: Tarjeta, campo: 'medidas' | 'tratamientos', id: number): void {
    if (t.registrado || this.guardando() === t.clave) return;
    const control = t.form.controls[campo];
    const actual = control.value;
    control.setValue(actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]);
    control.markAsDirty();
    control.markAsTouched();
  }
  protected abrirMonturas(t: Tarjeta): void {
    if (t.registrado) return;
    this.selector.set(t);
    this.paginas.next(0);
  }
  protected paginaMonturas(page: number): void {
    this.paginas.next(page);
  }
  protected elegir(m: Montura): void {
    const t = this.selector();
    if (!t || t.registrado || this.guardando() === t.clave || m.stock <= 0) return;
    t.form.controls.montura.setValue(m.idProducto);
    t.form.markAsDirty();
    this.selector.set(null);
  }
  protected sinMontura(t: Tarjeta): void {
    if (t.registrado || this.guardando() === t.clave) return;
    t.form.controls.montura.setValue(null);
    t.form.markAsDirty();
  }
  protected nombreMontura(t: Tarjeta): string {
    const id = t.form.controls.montura.value;
    return id
      ? this.monturasConocidas.get(id)?.nombre || 'Montura #' + id
      : 'Sin montura de inventario';
  }
  protected nombreMaterial(id: number | null): string {
    return this.materiales().find((m) => m.idMaterialCristal === id)?.nombre || 'Sin material';
  }
  protected guardar(t: Tarjeta): void {
    if (!this.permiso() || this.guardando() !== null || t.registrado) return;
    t.form.markAllAsTouched();
    t.error = '';
    if (t.form.invalid) {
      t.error =
        'Selecciona al menos una medida, un material y un subtotal válido (cero o mayor, máximo dos decimales).';
      return;
    }
    const v = t.form.getRawValue();
    if (!v.medidas.every((id) => this.receta()?.medidas.some((m) => m.idMedida === id))) {
      t.error = 'Las medidas deben pertenecer a esta receta.';
      return;
    }
    this.guardando.set(t.clave);
    t.form.disable();
    this.servicio
      .configurarLente(this.recetaId, {
        idReceta: this.recetaId,
        idMaterialCristal: v.material!,
        idProducto: v.montura,
        subTotal: v.subtotal!,
        medidasIds: v.medidas,
        tratamientosCristalIds: v.tratamientos,
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (l) => {
          t.registrado = l.idLente;
          t.form.markAsPristine();
          this.guardando.set(null);
          this.tarjetas.update((a) => [...a]);
          this.avisos.abrir({
            tipo: 'exito',
            titulo: 'Lente registrado',
            mensaje: `Se guardó el lente #${l.idLente}. Las demás configuraciones pendientes todavía no están guardadas.`,
          });
        },
        error: (e: unknown) => {
          this.guardando.set(null);
          t.form.enable();
          t.error = mensajeErrorHttp(e);
          this.avisos.abrir({
            tipo: 'error',
            titulo: 'No se pudo guardar el lente',
            mensaje: t.error,
          });
        },
      });
  }
  protected totalRegistrado(): number {
    return (
      (this.receta()?.lentes || []).reduce((s, l) => s + (l.subTotal || 0), 0) +
      this.tarjetas()
        .filter((t) => t.registrado)
        .reduce((s, t) => s + (t.form.controls.subtotal.value || 0), 0)
    );
  }
  protected totalPendiente(): number {
    return this.tarjetas()
      .filter((t) => !t.registrado && t.form.controls.subtotal.valid)
      .reduce((s, t) => s + (t.form.controls.subtotal.value || 0), 0);
  }
  protected verHistorial(): void {
    this.router.navigate(['/atencion-paciente-consulta/pacientes', this.pacienteId, 'historial'], {
      queryParams: { receta: this.recetaId },
    });
  }
  puedeSalir(): boolean | Promise<boolean> {
    if (this.guardando() !== null) return false;
    if (!this.tarjetas().some((t) => !t.registrado && t.form.dirty)) return true;
    return (this.confirmacion ??= this.avisos
      .confirmar({
        titulo: '¿Salir sin guardar las configuraciones pendientes?',
        mensaje: 'Los lentes registrados se conservarán. Los cambios pendientes se perderán.',
        textoConfirmar: 'Salir',
        peligrosa: true,
      })
      .finally(() => (this.confirmacion = undefined)));
  }
  @HostListener('window:beforeunload', ['$event']) proteger(e: BeforeUnloadEvent): void {
    if (this.guardando() !== null || this.tarjetas().some((t) => !t.registrado && t.form.dirty)) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
}
