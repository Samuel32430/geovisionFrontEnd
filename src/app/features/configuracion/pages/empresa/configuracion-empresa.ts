import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CabeceraPagina } from '../../../../shared/components/cabecera-pagina/cabecera-pagina';
import { Icono } from '../../../../shared/components/icono/icono';
import { AvisoService } from '../../../../shared/aviso-service';
import { ConfiguracionApi } from '../../services/configuracion-api';
import { ConfiguracionEmpresa } from '../../models/configuracion.model';

function limpiar(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  const trimmed = valor.trim();
  return trimmed.length === 0 ? null : trimmed;
}

@Component({
  selector: 'app-configuracion-empresa',
  imports: [CabeceraPagina, Icono, ReactiveFormsModule],
  templateUrl: './configuracion-empresa.html',
  styleUrl: './configuracion-empresa.css',
})
export class ConfiguracionEmpresaPage implements OnInit {
  private readonly api = inject(ConfiguracionApi);
  private readonly avisos = inject(AvisoService);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly errorCarga = signal<string | null>(null);
  readonly empresa = signal<ConfiguracionEmpresa | null>(null);
  readonly editando = signal(false);
  readonly logoError = signal(false);

  readonly form = new FormGroup({
    nombreLegal: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    nombreComercial: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
    ruc: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^[0-9]{11}$/),
      ],
    }),
    direccion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
    telefono: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(100)],
    }),
    logo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.api.obtener().subscribe({
      next: (datos) => {
        this.empresa.set(datos);
        if (datos) {
          this.poblarFormulario(datos);
          this.editando.set(false);
        } else {
          this.form.reset();
          this.editando.set(true);
        }
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.errorCarga.set(
          err instanceof Error ? err.message : 'No se pudo conectar con el servicio de configuración.',
        );
        this.cargando.set(false);
      },
    });
  }

  iniciarEdicion(): void {
    const actual = this.empresa();
    if (actual) {
      this.poblarFormulario(actual);
    }
    this.editando.set(true);
  }

  cancelarEdicion(): void {
    const actual = this.empresa();
    if (actual) {
      this.poblarFormulario(actual);
      this.editando.set(false);
    }
  }

  private poblarFormulario(datos: ConfiguracionEmpresa): void {
    this.form.setValue({
      nombreLegal: datos.nombreLegal ?? '',
      nombreComercial: datos.nombreComercial ?? '',
      ruc: datos.ruc ?? '',
      direccion: datos.direccion ?? '',
      telefono: datos.telefono ?? '',
      correo: datos.correo ?? '',
      logo: datos.logo ?? '',
    });
    this.logoError.set(false);
  }

  async guardar(): Promise<void> {
    if (this.guardando()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const valores = this.form.getRawValue();
    const esRegistroNuevo = this.empresa() === null;

    const confirmado = await this.avisos.confirmar({
      titulo: esRegistroNuevo ? '¿Registrar datos de la empresa?' : '¿Guardar cambios?',
      mensaje: esRegistroNuevo
        ? 'Se registrarán los datos iniciales de la empresa para la emisión de recetas y comprobantes.'
        : 'Los datos institucionales serán actualizados en todo el sistema.',
      textoConfirmar: esRegistroNuevo ? 'Registrar' : 'Guardar cambios',
    });

    if (!confirmado) return;

    const payload: ConfiguracionEmpresa = {
      id: this.empresa()?.id ?? null,
      nombreLegal: valores.nombreLegal.trim(),
      nombreComercial: limpiar(valores.nombreComercial),
      ruc: valores.ruc.trim(),
      direccion: limpiar(valores.direccion),
      telefono: limpiar(valores.telefono),
      correo: limpiar(valores.correo),
      logo: limpiar(valores.logo),
    };

    this.guardando.set(true);
    const peticion = esRegistroNuevo
      ? this.api.registrar(payload)
      : this.api.actualizar(payload);

    peticion.subscribe({
      next: (resultado) => {
        this.empresa.set(resultado);
        this.poblarFormulario(resultado);
        this.editando.set(false);
        this.guardando.set(false);
        this.avisos.abrir({
          titulo: 'Configuración guardada',
          mensaje: esRegistroNuevo
            ? 'Los datos de la empresa han sido registrados exitosamente.'
            : 'La configuración de la empresa ha sido actualizada correctamente.',
          tipo: 'exito',
        });
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        let mensajeError = 'Ocurrió un error al procesar la solicitud.';
        if (typeof err === 'object' && err !== null && 'error' in err) {
          const apiError = (err as { error?: { message?: string } }).error;
          if (apiError?.message) {
            mensajeError = apiError.message;
          }
        }
        this.avisos.abrir({
          titulo: 'Error al guardar',
          mensaje: mensajeError,
          tipo: 'error',
        });
      },
    });
  }
}
