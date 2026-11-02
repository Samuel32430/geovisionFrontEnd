import { AvisoCerrable } from '../../../shared/aviso-cerrable';
import { Icono } from '../../../shared/components/icono/icono';
import { Component, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { SeguridadApi } from '../seguridad-api';
import { Usuario, UsuarioCambios } from '../seguridad.model';
import { CabeceraPagina } from '../../../shared/components/cabecera-pagina/cabecera-pagina';
import { AvisoService } from '../../../shared/aviso-service';
import { SesionService } from '../../../core/auth/sesion-service';
import { mensajeErrorHttp } from '../../../core/utils/http-error';

export const passwordUsuario: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value as string;
  if (!valor) return null;
  return valor.length < 6 || valor.length > 100 || new TextEncoder().encode(valor).length > 72
    ? { password: true }
    : null;
};
export const confirmarPassword: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null =>
  control.get('password')?.value !== control.get('confirmacion')?.value
    ? { confirmacion: true }
    : null;

@Component({
  selector: 'app-usuario-form',
  imports: [AvisoCerrable, ReactiveFormsModule, RouterLink, CabeceraPagina, Icono],
  templateUrl: './usuario-form.html',
})
export class UsuarioForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(SeguridadApi);
  private readonly avisos = inject(AvisoService);
  private readonly sesion = inject(SesionService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly nuevo = !this.route.snapshot.paramMap.has('id');
  protected readonly usuario = signal<Usuario | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorGuardar = signal<string | null>(null);
  protected readonly mostrarPassword = signal(false);
  protected readonly form = new FormGroup(
    {
      nombre: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
          Validators.pattern(/.*\S.*/),
        ],
      }),
      correo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email, Validators.maxLength(100)],
      }),
      password: new FormControl('', { nonNullable: true, validators: [passwordUsuario] }),
      confirmacion: new FormControl('', { nonNullable: true }),
    },
    { validators: [confirmarPassword] },
  );
  ngOnInit() {
    if (!this.nuevo) this.cargar();
  }
  protected cargar() {
    if (this.cargando() || this.guardando()) return;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.error.set('La cuenta solicitada no es válida.');
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .usuario(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (u) => {
          this.usuario.set(u);
          this.form.reset({ nombre: u.nombre, correo: u.correo, password: '', confirmacion: '' });
        },
        error: (e: unknown) => this.error.set(mensajeErrorHttp(e)),
      });
  }
  protected guardar() {
    const usuario = this.usuario();
    if (!usuario || this.nuevo || this.guardando()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.form.dirty) return;
    const valores = this.form.getRawValue();
    const nombre = valores.nombre.trim();
    if (nombre.length < 3) {
      this.form.controls.nombre.setErrors({ minlength: true });
      return;
    }
    const datos: UsuarioCambios = {
      nombre,
      correo: valores.correo.trim().toLowerCase(),
      idPersona: usuario.idPersona,
      estado: usuario.estado,
    };
    if (valores.password) datos.password = valores.password;
    this.errorGuardar.set(null);
    this.guardando.set(true);
    this.form.disable();
    this.api
      .actualizar(usuario.idUsuario, datos)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.guardando.set(false);
          this.form.enable();
        }),
      )
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.form.reset({ nombre, correo: datos.correo, password: '', confirmacion: '' });
          if (usuario.idUsuario === this.sesion.actual()?.idUsuario) {
            // El JWT usa el nombre de usuario como subject; renovar la sesión evita conservar credenciales antiguas.
            this.sesion.limpiar();
            void this.router.navigate(['/login']);
            this.avisos.abrir({
              tipo: 'exito',
              titulo: 'Cuenta actualizada',
              mensaje: 'Inicia sesión nuevamente con los datos de tu cuenta.',
            });
          } else {
            void this.router.navigate(['/seguridad/usuarios']);
            this.avisos.abrir({
              tipo: 'exito',
              titulo: 'Usuario actualizado',
              mensaje: 'Los cambios de la cuenta se guardaron correctamente.',
            });
          }
        },
        error: (e: unknown) => this.errorGuardar.set(mensajeErrorHttp(e)),
      });
  }
  puedeSalir(): boolean | Promise<boolean> {
    if (this.guardando()) return false;
    return (
      !this.form.dirty ||
      this.avisos.confirmar({
        titulo: '¿Salir sin guardar?',
        mensaje: 'Los cambios de la cuenta se descartarán.',
        textoConfirmar: 'Salir sin guardar',
      })
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  proteger(event: BeforeUnloadEvent) {
    if (this.form.dirty || this.guardando()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
