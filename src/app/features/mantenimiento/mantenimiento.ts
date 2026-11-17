import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, KeyValuePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { MantenimientoService, Catalogo, RegistroCatalogo } from './mantenimiento.service';
import { AvisoService } from '../../shared/aviso-service';
import { mensajeErrorHttp } from '../../core/utils/http-error';

@Component({
  selector: 'app-mantenimiento',
  imports: [FormsModule, CurrencyPipe, KeyValuePipe],
  templateUrl: './mantenimiento.html',
  styleUrl: './mantenimiento.css',
})
export class Mantenimiento implements OnInit {
  private readonly api = inject(MantenimientoService);
  private readonly avisos = inject(AvisoService);
  private readonly destroyRef = inject(DestroyRef);
  private consulta?: Subscription;
  private readonly dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogo');
  private readonly formRef = viewChild<NgForm>('form');
  private focoAnterior?: HTMLElement;
  readonly catalogos: { clave: Catalogo; titulo: string; singular: string }[] = [
    { clave: 'categorias', titulo: 'Categorías', singular: 'categoría' },
    {
      clave: 'materiales-cristal',
      titulo: 'Materiales de cristal',
      singular: 'material de cristal',
    },
    { clave: 'tratamientos-cristal', titulo: 'Tratamientos', singular: 'tratamiento' },
    { clave: 'servicios', titulo: 'Servicios', singular: 'servicio' },
    { clave: 'laboratorios', titulo: 'Laboratorios', singular: 'laboratorio' },
  ];
  readonly seleccionado = signal(this.catalogos[0]);
  readonly registros = signal<RegistroCatalogo[]>([]);
  readonly cargando = signal(false);
  readonly ocupado = signal(false);
  readonly error = signal('');
  readonly errorFormulario = signal('');
  readonly erroresCampos = signal<Record<string, string>>({});
  readonly pagina = signal(0);
  readonly paginas = signal(0);
  readonly total = signal(0);
  termino = '';
  estado = '';
  formulario: RegistroCatalogo = { nombre: '', estado: 1 };

  ngOnInit() {
    this.cargar();
  }
  tieneEstado() {
    return !['materiales-cristal', 'tratamientos-cristal'].includes(this.seleccionado().clave);
  }
  tieneDescripcion() {
    return ['categorias', 'servicios'].includes(this.seleccionado().clave);
  }
  limiteNombre() {
    return ['servicios', 'laboratorios'].includes(this.seleccionado().clave) ? 200 : 100;
  }

  seleccionar(catalogo: (typeof this.catalogos)[number]) {
    if (this.ocupado()) return;
    this.seleccionado.set(catalogo);
    this.termino = '';
    this.estado = '';
    this.cargar();
  }

  cargar(page = 0) {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.error.set('');
    this.registros.set([]);
    this.consulta = this.api
      .listar(this.seleccionado().clave, this.termino, this.estado, page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.registros.set(res.content);
          this.pagina.set(res.number);
          this.paginas.set(res.totalPages);
          this.total.set(res.totalElements);
          this.cargando.set(false);
        },
        error: (err) => {
          this.error.set(mensajeErrorHttp(err));
          this.cargando.set(false);
        },
      });
  }

  abrir(registro?: RegistroCatalogo) {
    this.formulario = registro
      ? { ...registro }
      : { nombre: '', ...(this.tieneEstado() ? { estado: 1 } : {}) };
    this.errorFormulario.set('');
    this.erroresCampos.set({});
    this.formRef()?.resetForm({ ...this.formulario, estadoRegistro: this.formulario.estado });
    this.focoAnterior = document.activeElement as HTMLElement;
    this.dialogo()?.nativeElement.showModal();
  }

  cerrar(event?: Event) {
    if (this.ocupado()) {
      event?.preventDefault();
      return;
    }
    this.dialogo()?.nativeElement.close();
    this.focoAnterior?.focus();
  }

  async guardar(form: NgForm) {
    if (this.ocupado()) return;
    this.errorFormulario.set('');
    this.erroresCampos.set({});
    if (form.invalid || !this.formulario.nombre.trim()) {
      form.control.markAllAsTouched();
      this.errorFormulario.set('Revisa los campos obligatorios y sus formatos.');
      return;
    }
    this.ocupado.set(true);
    if (this.formulario.id != null && this.formulario.estado === 0) {
      this.dialogo()?.nativeElement.close();
      const confirmado = await this.avisos.confirmar({
        titulo: 'Guardar registro inactivo',
        mensaje:
          'El registro quedará inactivo. El sistema comprobará si tiene dependencias que impidan desactivarlo.',
        textoConfirmar: 'Guardar',
      });
      if (this.destroyRef.destroyed) return;
      this.dialogo()?.nativeElement.showModal();
      if (!confirmado) {
        this.ocupado.set(false);
        return;
      }
    }
    if (this.destroyRef.destroyed) return;
    const registro = { ...this.formulario, nombre: this.formulario.nombre.trim() };
    this.api
      .guardar(this.seleccionado().clave, registro)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ocupado.set(false);
          this.cerrar();
          form.resetForm();
          this.avisos.abrir({
            titulo: 'Cambios guardados',
            mensaje: `Se guardó el registro de ${this.seleccionado().singular} correctamente.`,
            tipo: 'exito',
          });
          this.cargar(this.pagina());
        },
        error: (err) => {
          this.ocupado.set(false);
          this.errorFormulario.set(mensajeErrorHttp(err));
          if (err instanceof HttpErrorResponse)
            this.erroresCampos.set(err.error?.validationErrors ?? {});
        },
      });
  }

  async alternar(registro: RegistroCatalogo) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    const activar = registro.estado === 0;
    const confirmado = await this.avisos.confirmar({
      titulo: activar ? 'Activar registro' : 'Desactivar registro',
      mensaje: `¿Deseas ${activar ? 'activar' : 'desactivar'} “${registro.nombre}”?`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
    });
    if (this.destroyRef.destroyed) return;
    if (!confirmado) {
      this.ocupado.set(false);
      return;
    }
    this.api
      .guardar(this.seleccionado().clave, { ...registro, estado: activar ? 1 : 0 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ocupado.set(false);
          this.cargar(this.pagina());
          this.avisos.abrir({
            titulo: 'Estado actualizado',
            mensaje: `El registro fue ${activar ? 'activado' : 'desactivado'}.`,
            tipo: 'exito',
          });
        },
        error: (err) => {
          this.ocupado.set(false);
          this.avisos.abrir({
            titulo: 'No se pudo cambiar el estado',
            mensaje: mensajeErrorHttp(err),
            tipo: 'error',
          });
        },
      });
  }
}
