import { Component, DestroyRef, inject, OnInit, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  defer,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
} from 'rxjs';
import { SeguridadApi } from '../seguridad-api';
import { PersonaParaUsuario } from '../seguridad.model';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { mensajeErrorHttp } from '../../../core/utils/http-error';

@Component({
  selector: 'app-persona-selector',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="panel form-content person-search" aria-label="Buscar empleado">
      <h2>Empleado asociado</h2>
      <p>Busca un empleado activo por nombre o documento.</p>
      <form class="person-search-form" (submit)="$event.preventDefault(); consultar(0)">
        <label class="field"
          >Nombre o documento<input
            type="search"
            [formControl]="busqueda"
            maxlength="150"
            placeholder="Buscar empleado…" /></label
        ><button class="btn" type="submit">Buscar</button>
      </form>
      @if (cargando()) {
        <p role="status">Buscando empleados…</p>
      } @else if (error()) {
        <p role="alert" class="error">{{ error() }}</p>
        <button class="btn" type="button" (click)="consultar(0)">Reintentar</button>
      } @else if (resultado(); as datos) {
        <div class="person-results">
          @for (p of datos.content; track p.idPersona) {
            <article class="person-result">
              <div>
                <strong>{{ p.nombreCompleto }}</strong>
                <p>
                  {{ p.tipoDocumento === 'CARNET_EXTRANJERIA' ? 'CE' : p.tipoDocumento }} ·
                  {{ p.numeroDocumento }}
                </p>
                <span class="badge" [class.inactive]="p.tieneUsuario">{{
                  p.tieneUsuario
                    ? p.estadoUsuario === 1
                      ? 'Cuenta activa'
                      : 'Cuenta inactiva'
                    : 'Sin cuenta'
                }}</span>
              </div>
              @if (p.tieneUsuario) {
                <div>
                  <p>Esta persona ya tiene un usuario: {{ p.nombreUsuario }}.</p>
                  <a class="btn" [routerLink]="['/seguridad/usuarios', p.idUsuario, 'editar']"
                    >Editar usuario</a
                  >
                </div>
              } @else {
                <button
                  class="btn"
                  type="button"
                  (click)="seleccionar.emit(p)"
                  [disabled]="!p.esEmpleado || !p.empleadoActivo"
                  [attr.aria-label]="'Seleccionar a ' + p.nombreCompleto"
                >
                  Seleccionar empleado
                </button>
              }
            </article>
          } @empty {
            <p role="status">No se encontraron empleados activos para esta búsqueda.</p>
          }
        </div>
        <div class="pagination">
          <span>{{ datos.totalElements }} empleados encontrados</span>
          <div class="actions">
            <button
              class="btn"
              type="button"
              [disabled]="datos.first"
              (click)="consultar(datos.number - 1)"
            >
              Anterior</button
            ><span>{{ datos.totalPages ? datos.number + 1 : 0 }} / {{ datos.totalPages }}</span
            ><button
              class="btn"
              type="button"
              [disabled]="datos.last"
              (click)="consultar(datos.number + 1)"
            >
              Siguiente
            </button>
          </div>
        </div>
        <div class="search-new">
          <p>¿El empleado no aparece?</p>
          <button class="btn" type="button" (click)="nueva.emit()">Registrar nuevo empleado</button>
        </div>
      }
    </section>
  `,
})
export class PersonaSelector implements OnInit {
  private readonly api = inject(SeguridadApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly consultas = new BehaviorSubject({ termino: '', page: 0 });
  readonly seleccionar = output<PersonaParaUsuario>();
  readonly nueva = output<void>();
  protected readonly busqueda = new FormControl('', { nonNullable: true });
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<PaginaResponse<PersonaParaUsuario> | null>(null);
  ngOnInit() {
    this.consultas
      .pipe(
        switchMap((q) =>
          defer(() => {
            this.cargando.set(true);
            this.error.set(null);
            this.resultado.set(null);
            return this.api.personas(q.termino, q.page).pipe(
              catchError((e: unknown) => {
                this.error.set(mensajeErrorHttp(e));
                return of(null);
              }),
              finalize(() => this.cargando.set(false)),
            );
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((pagina) => this.resultado.set(pagina));
    this.busqueda.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.consultar(0));
  }
  protected consultar(page: number) {
    this.consultas.next({ termino: this.busqueda.value.trim(), page });
  }
}
