import { Component, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PersonaSelector } from './persona-selector';
import { SeguridadApi } from '../seguridad-api';
import { CuentaUsuarioAlta, PersonaNuevaAlta, PersonaParaUsuario, Rol } from '../seguridad.model';
import { passwordUsuario, confirmarPassword } from '../usuario-form/usuario-form';
import { CabeceraPagina } from '../../../shared/components/cabecera-pagina/cabecera-pagina';
import { Icono } from '../../../shared/components/icono/icono';
import { AvisoCerrable } from '../../../shared/aviso-cerrable';
import { AvisoService } from '../../../shared/aviso-service';
import { mensajeErrorHttp } from '../../../core/utils/http-error';

const requerido: ValidatorFn = (c) =>
  typeof c.value === 'string' && c.value.trim() ? null : { required: true };
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const fechaAltaValida =
  (nacimiento: boolean): ValidatorFn =>
  (c) => {
    if (!c.value) return null;
    const texto = String(c.value),
      fecha = new Date(`${texto}T12:00:00`);
    const [anio, mes, dia] = texto.split('-').map(Number);
    return /^\d{4}-\d{2}-\d{2}$/.test(texto) &&
      fecha.getFullYear() === anio &&
      fecha.getMonth() + 1 === mes &&
      fecha.getDate() === dia &&
      (!nacimiento || texto <= hoy())
      ? null
      : { fecha: true };
  };

@Component({
  selector: 'app-usuario-nuevo',
  imports: [ReactiveFormsModule, RouterLink, PersonaSelector, CabeceraPagina, Icono, AvisoCerrable],
  templateUrl: './usuario-nuevo.html',
})
export class UsuarioNuevo implements OnInit {
  private readonly api = inject(SeguridadApi);
  private readonly avisos = inject(AvisoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly persona = signal<PersonaParaUsuario | null>(null);
  protected readonly nuevaPersona = signal(false);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly cargandoRoles = signal(false);
  protected readonly rolesListos = signal(false);
  protected readonly errorRoles = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mostrarPassword = signal(false);
  protected readonly maxFecha = hoy();
  protected readonly tiposDocumento = ['DNI', 'RUC', 'CARNET_EXTRANJERIA', 'PASAPORTE'] as const;
  protected readonly cuenta = new FormGroup(
    {
      nombre: new FormControl('', {
        nonNullable: true,
        validators: [requerido, Validators.minLength(3), Validators.maxLength(100)],
      }),
      correo: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email, Validators.maxLength(100)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordUsuario],
      }),
      confirmacion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      roles: new FormControl<number[]>([], { nonNullable: true }),
    },
    { validators: confirmarPassword },
  );
  protected readonly datosPersona = new FormGroup({
    tipoDocumento: new FormControl<PersonaParaUsuario['tipoDocumento']>('DNI', {
      nonNullable: true,
      validators: Validators.required,
    }),
    numeroDocumento: new FormControl('', {
      nonNullable: true,
      validators: [requerido, Validators.maxLength(50)],
    }),
    nombres: new FormControl('', {
      nonNullable: true,
      validators: [requerido, Validators.maxLength(150)],
    }),
    apellidos: new FormControl('', {
      nonNullable: true,
      validators: [requerido, Validators.maxLength(150)],
    }),
    fechaNacimiento: new FormControl('', { nonNullable: true, validators: fechaAltaValida(true) }),
    sexo: new FormControl<'' | 'MASCULINO' | 'FEMENINO'>('', { nonNullable: true }),
    telefono: new FormControl('', { nonNullable: true, validators: Validators.maxLength(50) }),
    direccion: new FormControl('', { nonNullable: true, validators: Validators.maxLength(200) }),
  });
  protected readonly fechaContrato = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, fechaAltaValida(false)],
  });

  ngOnInit() {
    this.cargarRoles();
  }
  protected cargarRoles() {
    if (this.cargandoRoles() || this.guardando()) return;
    this.cargandoRoles.set(true);
    this.errorRoles.set(null);
    this.rolesListos.set(false);
    this.api
      .roles()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoRoles.set(false)),
      )
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.rolesListos.set(true);
        },
        error: (e: unknown) => this.errorRoles.set(mensajeErrorHttp(e)),
      });
  }
  protected elegir(p: PersonaParaUsuario) {
    if (
      this.guardando() ||
      p.tieneUsuario ||
      !p.esEmpleado ||
      !p.empleadoActivo ||
      !Number.isSafeInteger(p.idPersona) ||
      p.idPersona <= 0
    )
      return;
    this.persona.set(p);
    this.nuevaPersona.set(false);
    this.error.set(null);
    this.cuenta.markAsDirty();
  }
  protected nueva() {
    this.nuevaPersona.set(true);
    this.persona.set(null);
    this.cuenta.markAsDirty();
  }
  protected async cambiarPersona() {
    if (this.guardando()) return;
    if (
      this.datosPersona.dirty &&
      !(await this.avisos.confirmar({
        titulo: '¿Cambiar la persona?',
        mensaje:
          'Se descartarán los datos personales ingresados. Los datos de acceso se conservarán.',
        textoConfirmar: 'Cambiar persona',
      }))
    )
      return;
    if (this.destroyRef.destroyed) return;
    this.persona.set(null);
    this.nuevaPersona.set(false);
    this.datosPersona.reset();
    this.fechaContrato.reset();
    this.error.set(null);
  }
  protected alternarRol(id: number) {
    if (this.guardando()) return;
    const c = this.cuenta.controls.roles;
    c.setValue(c.value.includes(id) ? c.value.filter((r) => r !== id) : [...c.value, id]);
    c.markAsDirty();
  }
  protected guardar() {
    if (this.guardando() || !this.rolesListos() || (!this.persona() && !this.nuevaPersona()))
      return;
    this.cuenta.markAllAsTouched();
    if (this.nuevaPersona()) this.datosPersona.markAllAsTouched();
    if (this.nuevaPersona()) this.fechaContrato.markAsTouched();
    if (
      this.cuenta.invalid ||
      (this.nuevaPersona() && this.datosPersona.invalid) ||
      (this.nuevaPersona() && this.fechaContrato.invalid)
    )
      return;
    const valores = this.cuenta.getRawValue();
    const nombre = valores.nombre.trim();
    if (nombre.length < 3) {
      this.cuenta.controls.nombre.setErrors({ minlength: true });
      return;
    }
    const cuenta: CuentaUsuarioAlta = {
      nombre,
      correo: valores.correo.trim().toLowerCase(),
      password: valores.password,
      estado: 1,
      rolesIds: [...valores.roles],
    };
    const empleado = { fechaContrato: this.fechaContrato.value };
    const p = this.datosPersona.getRawValue();
    const limpiar = (v: string) => v.trim() || null;
    const persona: PersonaNuevaAlta = {
      ...p,
      nombres: p.nombres.trim(),
      apellidos: p.apellidos.trim(),
      numeroDocumento: p.numeroDocumento.trim(),
      fechaNacimiento: p.fechaNacimiento || null,
      sexo: p.sexo || null,
      telefono: limpiar(p.telefono),
      direccion: limpiar(p.direccion),
    };
    const solicitud = this.nuevaPersona()
      ? this.api.crearPersonaUsuario({
          persona,
          usuario: cuenta,
          empleado,
        })
      : this.api.crearUsuario({
          ...cuenta,
          idPersona: this.persona()!.idPersona,
        });
    this.guardando.set(true);
    this.error.set(null);
    this.cuenta.disable();
    this.datosPersona.disable();
    this.fechaContrato.disable();
    solicitud
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.guardando.set(false);
          this.cuenta.enable();
          this.datosPersona.enable();
          this.fechaContrato.enable();
        }),
      )
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.cuenta.reset();
          this.datosPersona.markAsPristine();
          this.fechaContrato.markAsPristine();
          this.avisos.abrir({
            tipo: 'exito',
            titulo: 'Usuario registrado',
            mensaje: 'La cuenta se creó correctamente.',
          });
          void this.router.navigate(['/seguridad/usuarios']);
        },
        error: (e: unknown) => this.error.set(mensajeErrorHttp(e)),
      });
  }
  puedeSalir(): boolean | Promise<boolean> {
    if (this.guardando()) return false;
    return (
      (!this.cuenta.dirty && !this.datosPersona.dirty && !this.fechaContrato.dirty) ||
      this.avisos.confirmar({
        titulo: '¿Salir sin guardar?',
        mensaje: 'Los datos de registro no guardados se descartarán.',
        textoConfirmar: 'Salir sin guardar',
      })
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  proteger(e: BeforeUnloadEvent) {
    if (
      this.guardando() ||
      this.cuenta.dirty ||
      this.datosPersona.dirty ||
      this.fechaContrato.dirty
    ) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
}
