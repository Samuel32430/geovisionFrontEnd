import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth-service';
import { retornoSeguro } from '../../../../core/auth/auth.model';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import { Icono } from '../../../../shared/components/icono/icono';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Icono],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly visible = signal(false);
  protected readonly ingresando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expirada = this.route.snapshot.queryParamMap.get('expirada') === '1';
  protected readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
  });

  protected ingresar(): void {
    if (this.ingresando()) return;
    this.error.set(null);
    this.form.controls.username.setValue(this.form.controls.username.value.trim(), {
      emitEvent: false,
    });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const request = this.form.getRawValue();
    this.ingresando.set(true);
    this.form.disable({ emitEvent: false });
    this.auth
      .login(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.ingresando.set(false);
          this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: () => {
          this.form.controls.password.reset('', { emitEvent: false });
          this.visible.set(false);
          void this.router.navigateByUrl(
            retornoSeguro(this.route.snapshot.queryParamMap.get('returnUrl')),
          );
        },
        error: (error: unknown) =>
          this.error.set(
            error instanceof HttpErrorResponse && error.status === 401
              ? 'El usuario o la contraseña no son correctos.'
              : error instanceof Error &&
                  !(error instanceof HttpErrorResponse) &&
                  error.name !== 'TimeoutError'
                ? 'No se pudo establecer una sesión válida. Intenta nuevamente.'
                : mensajeErrorHttp(error),
          ),
      });
  }
}
