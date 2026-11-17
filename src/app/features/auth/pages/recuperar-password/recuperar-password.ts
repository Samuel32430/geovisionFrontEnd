import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth-service';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import { Icono } from '../../../../shared/components/icono/icono';

@Component({
  selector: 'app-recuperar-password',
  imports: [ReactiveFormsModule, RouterLink, Icono],
  templateUrl: './recuperar-password.html',
  styleUrl: './recuperar-password.css',
})
export class RecuperarPassword {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly correoEnviado = signal<string>('');

  protected readonly form = this.fb.group({
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
  });

  protected enviar(): void {
    if (this.enviando()) return;
    this.error.set(null);
    const correoRaw = this.form.controls.correo.value.trim().toLowerCase();
    this.form.controls.correo.setValue(correoRaw, { emitEvent: false });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.form.disable({ emitEvent: false });

    this.auth
      .solicitarRecuperacionPassword(correoRaw)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.enviando.set(false);
          this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: () => {
          this.correoEnviado.set(correoRaw);
          this.enviado.set(true);
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 404) {
              this.error.set('No se encontró ninguna cuenta registrada con este correo electrónico.');
              return;
            }
            if (err.status === 400 && err.error?.mensaje) {
              this.error.set(err.error.mensaje);
              return;
            }
          }
          this.error.set(mensajeErrorHttp(err));
        },
      });
  }
}
