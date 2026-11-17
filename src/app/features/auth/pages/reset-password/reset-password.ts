import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth-service';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import { Icono } from '../../../../shared/components/icono/icono';

export const passwordsCoincidenValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const nuevo = control.get('nuevoPassword')?.value;
  const confirmar = control.get('confirmarPassword')?.value;
  return nuevo && confirmar && nuevo !== confirmar ? { noCoinciden: true } : null;
};

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, Icono],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly token = signal<string>('');
  protected readonly validandoToken = signal(true);
  protected readonly tokenValido = signal(false);
  protected readonly mensajeTokenInvalido = signal<string>('');

  protected readonly visibleNuevo = signal(false);
  protected readonly visibleConfirmar = signal(false);
  protected readonly guardando = signal(false);
  protected readonly exito = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group(
    {
      nuevoPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
      confirmarPassword: ['', [Validators.required]],
    },
    { validators: [passwordsCoincidenValidator] },
  );

  ngOnInit(): void {
    const rawToken = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    this.token.set(rawToken);

    if (!rawToken) {
      this.validandoToken.set(false);
      this.tokenValido.set(false);
      this.mensajeTokenInvalido.set(
        'No se proporcionó un token de recuperación válido. Por favor, solicita un nuevo enlace.',
      );
      return;
    }

    this.auth
      .validarTokenRecuperacion(rawToken)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.validandoToken.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.tokenValido.set(res.valido);
          if (!res.valido) {
            this.mensajeTokenInvalido.set(
              'El enlace de recuperación es inválido o ha expirado (vigencia 15 min). Por favor, solicita uno nuevo.',
            );
          }
        },
        error: () => {
          this.tokenValido.set(false);
          this.mensajeTokenInvalido.set(
            'No se pudo verificar la validez del enlace. Por favor, verifica tu conexión o solicita uno nuevo.',
          );
        },
      });
  }

  protected restablecer(): void {
    if (this.guardando() || !this.tokenValido()) return;
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nuevoPassword, confirmarPassword } = this.form.getRawValue();

    this.guardando.set(true);
    this.form.disable({ emitEvent: false });

    this.auth
      .restablecerPassword({
        token: this.token(),
        nuevoPassword,
        confirmarPassword,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.guardando.set(false);
          this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: () => {
          this.exito.set(true);
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.error?.mensaje) {
            this.error.set(err.error.mensaje);
            return;
          }
          this.error.set(mensajeErrorHttp(err));
        },
      });
  }
}
