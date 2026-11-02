import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, defer, finalize, of, switchMap } from 'rxjs';
import { AvisoService } from '../../../../shared/aviso-service';
import { Icono } from '../../../../shared/components/icono/icono';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import { PacienteService } from '../../services/paciente';
import { TipoDocumento } from '../../models/paciente.model';
import { PacienteRequest } from '../../models/paciente-request.model';

const requerido: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };
const hoy = () => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};
const fechaNacimientoValida: ValidatorFn = (control) => {
  if (!control.value) return null;
  const valor = String(control.value);
  const fecha = new Date(`${valor}T12:00:00`);
  const [anio, mes, dia] = valor.split('-').map(Number);
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    !Number.isNaN(fecha.getTime()) &&
    fecha.getFullYear() === anio &&
    fecha.getMonth() + 1 === mes &&
    fecha.getDate() === dia &&
    valor <= hoy()
    ? null
    : { fecha: true };
};

@Component({
  selector: 'app-paciente-form',
  imports: [ReactiveFormsModule, RouterLink, Icono],
  templateUrl: './paciente-form.html',
  styleUrl: './paciente-form.css',
})
export class PacienteForm implements OnInit {
  readonly id = input<string>();
  private readonly ids = toObservable(this.id);
  private readonly reintentos = new BehaviorSubject<void>(undefined);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly servicio = inject(PacienteService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly avisos = inject(AvisoService);
  protected readonly editando = computed(() => this.id() !== undefined);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly disponible = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly erroresServidor = signal<Record<string, string>>({});
  protected readonly duplicado = signal(false);
  protected readonly buscandoDuplicado = signal(false);
  protected readonly maxFecha = hoy();
  private idValido: number | null = null;
  private salidaConfirmada = false;
  private confirmacionSalida?: Promise<boolean>;

  protected readonly documentos: { valor: TipoDocumento; etiqueta: string }[] = [
    { valor: 'DNI', etiqueta: 'DNI - Documento Nacional de Identidad' },
    { valor: 'RUC', etiqueta: 'RUC - Registro Único de Contribuyentes' },
    { valor: 'CARNET_EXTRANJERIA', etiqueta: 'Carnet de extranjería' },
    { valor: 'PASAPORTE', etiqueta: 'Pasaporte' },
  ];
  protected readonly form = this.fb.group({
    tipoDocumento: this.fb.control<TipoDocumento>('DNI', Validators.required),
    numeroDocumento: ['', [requerido, Validators.maxLength(50)]],
    nombres: ['', [requerido, Validators.maxLength(150)]],
    apellidos: ['', [requerido, Validators.maxLength(150)]],
    fechaNacimiento: ['', fechaNacimientoValida],
    sexo: this.fb.control<'' | 'MASCULINO' | 'FEMENINO'>(''),
    telefono: ['', Validators.maxLength(50)],
    direccion: ['', Validators.maxLength(200)],
  });
  private readonly fechaNacimiento = toSignal(this.form.controls.fechaNacimiento.valueChanges, {
    initialValue: '',
  });
  protected readonly edad = computed(() => {
    const valor = this.fechaNacimiento();
    if (!valor || this.form.controls.fechaNacimiento.invalid) return null;
    const [anio, mes, dia] = valor.split('-').map(Number);
    const actual = new Date();
    return (
      actual.getFullYear() -
      anio -
      (actual.getMonth() + 1 < mes || (actual.getMonth() + 1 === mes && actual.getDate() < dia)
        ? 1
        : 0)
    );
  });

  ngOnInit(): void {
    combineLatest([this.ids, this.reintentos])
      .pipe(
        switchMap(([id]) =>
          defer(() => {
            this.form.reset();
            this.form.disable({ emitEvent: false });
            this.disponible.set(false);
            this.cargando.set(true);
            this.error.set(null);
            this.erroresServidor.set({});
            this.duplicado.set(false);
            this.salidaConfirmada = false;
            this.idValido = null;
            if (id === undefined) return of(null).pipe(finalize(() => this.cargando.set(false)));
            if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
              this.error.set(
                'El identificador del paciente no es válido. Vuelve al listado y selecciona un paciente.',
              );
              return of(null).pipe(finalize(() => this.cargando.set(false)));
            }
            this.idValido = Number(id);
            return this.servicio.obtener(this.idValido).pipe(
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
      .subscribe((paciente) => {
        if (this.error()) return;
        if (paciente) {
          const persona = paciente.persona;
          this.form.reset({
            tipoDocumento: persona.tipoDocumento,
            numeroDocumento: persona.numeroDocumento,
            nombres: persona.nombres,
            apellidos: persona.apellidos,
            fechaNacimiento: persona.fechaNacimiento ?? '',
            sexo: persona.sexo ?? '',
            telefono: persona.telefono ?? '',
            direccion: persona.direccion ?? '',
          });
        }
        this.form.enable({ emitEvent: false });
        this.disponible.set(true);
      });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.erroresServidor.set({});
      this.duplicado.set(false);
    });
  }

  protected errorCampo(campo: keyof typeof this.form.controls): string | null {
    const servidor = this.erroresServidor()[`persona.${campo}`] ?? this.erroresServidor()[campo];
    if (servidor) return servidor;
    const control = this.form.controls[campo];
    if (!control.touched) return null;
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('maxlength'))
      return `Máximo ${control.errors?.['maxlength'].requiredLength} caracteres.`;
    if (control.hasError('fecha')) return 'Introduce una fecha válida que no sea futura.';
    return null;
  }

  protected guardar(): void {
    if (this.cargando() || this.guardando() || !this.disponible()) return;
    this.error.set(null);
    this.erroresServidor.set({});
    this.duplicado.set(false);
    const datos = this.form.getRawValue();
    const limpios = {
      ...datos,
      nombres: datos.nombres.trim(),
      apellidos: datos.apellidos.trim(),
      numeroDocumento: datos.numeroDocumento.trim(),
      telefono: datos.telefono.trim(),
      direccion: datos.direccion.trim(),
    };
    this.form.patchValue(limpios, { emitEvent: false });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const request: PacienteRequest = {
      persona: {
        ...limpios,
        fechaNacimiento: limpios.fechaNacimiento || null,
        sexo: limpios.sexo || null,
        telefono: limpios.telefono || null,
        direccion: limpios.direccion || null,
      },
    };
    this.guardando.set(true);
    this.form.disable({ emitEvent: false });
    const solicitud =
      this.idValido === null
        ? this.servicio.crear(request)
        : this.servicio.actualizar(this.idValido, request);
    solicitud
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.guardando.set(false);
          this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: (paciente) => {
          this.form.markAsPristine();
          this.salidaConfirmada = true;
          this.avisos.abrir({
            tipo: 'exito',
            titulo: this.editando()
              ? 'Datos actualizados correctamente'
              : 'Paciente registrado correctamente',
            mensaje: `Se guardaron los datos de ${paciente.persona.nombreCompleto || paciente.persona.nombres + ' ' + paciente.persona.apellidos}.`,
          });
          void this.router.navigate(['/atencion-paciente-consulta/pacientes', paciente.idPersona]);
        },
        error: (error: unknown) => {
          this.error.set(mensajeErrorHttp(error));
          if (
            error instanceof HttpErrorResponse &&
            error.error &&
            typeof error.error === 'object'
          ) {
            const cuerpo = error.error as { validationErrors?: unknown };
            if (cuerpo.validationErrors && typeof cuerpo.validationErrors === 'object') {
              this.erroresServidor.set(
                Object.fromEntries(
                  Object.entries(cuerpo.validationErrors).filter(
                    (entrada): entrada is [string, string] => typeof entrada[1] === 'string',
                  ),
                ),
              );
            }
            this.duplicado.set(
              error.status === 409 &&
                /documento|ya está registrada como paciente/i.test(this.error() ?? ''),
            );
          }
        },
      });
  }

  protected buscarExistente(): void {
    if (this.buscandoDuplicado() || this.guardando()) return;
    this.buscandoDuplicado.set(true);
    this.servicio
      .obtenerPorDocumento(this.form.controls.numeroDocumento.value)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.buscandoDuplicado.set(false)),
      )
      .subscribe({
        next: (paciente) => {
          void this.router.navigate(['/atencion-paciente-consulta/pacientes', paciente.idPersona]);
        },
        error: (error: unknown) =>
          this.avisos.abrir({
            tipo: 'informacion',
            titulo: 'No se pudo abrir el paciente existente',
            mensaje:
              error instanceof HttpErrorResponse && error.status === 404
                ? 'El documento puede pertenecer a una persona que todavía no está registrada como paciente. Se requiere revisar ese registro.'
                : mensajeErrorHttp(error),
          }),
      });
  }

  protected volver(): void {
    if (!this.guardando()) void this.router.navigate(['/atencion-paciente-consulta/pacientes']);
  }
  protected reintentar(): void {
    this.reintentos.next();
  }

  puedeSalir(): boolean | Promise<boolean> {
    if (this.salidaConfirmada) return true;
    if (this.guardando()) return false;
    if (!this.form.dirty) return true;
    this.confirmacionSalida ??= this.avisos
      .confirmar({
        titulo: '¿Descartar los cambios?',
        mensaje:
          'Tienes información sin guardar. Si sales, perderás los cambios de este formulario.',
        textoConfirmar: 'Salir sin guardar',
        textoCerrar: 'Seguir editando',
        peligrosa: true,
      })
      .then((salir) => {
        this.confirmacionSalida = undefined;
        return salir;
      });
    return this.confirmacionSalida;
  }

  @HostListener('window:beforeunload', ['$event'])
  protected antesDeCerrar(event: BeforeUnloadEvent): void {
    if (!this.salidaConfirmada && (this.form.dirty || this.guardando())) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
