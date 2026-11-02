import { AvisoCerrable } from '../../../shared/aviso-cerrable';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AvisoService } from '../../../shared/aviso-service';
import { mismosIds, Rol, Usuario } from '../seguridad.model';

@Component({
  selector: 'app-roles-dialog',
  imports: [AvisoCerrable],
  template: `
    <dialog
      #dialog
      class="security-dialog"
      aria-labelledby="roles-dialog-title"
      (cancel)="$event.preventDefault(); cerrar()"
    >
      <header>
        <h2 id="roles-dialog-title">Asignar roles</h2>
        <button
          type="button"
          class="btn"
          [disabled]="guardando()"
          (click)="cerrar()"
          aria-label="Cerrar asignación de roles"
        >
          ✕
        </button>
      </header>
      <div class="dialog-body">
        <p class="dialog-account">
          <strong>{{ usuario().nombreCompletoPersona || usuario().nombre }}</strong
          ><br />{{ usuario().nombre }}
        </p>
        <p>La selección reemplazará los roles actuales de esta cuenta.</p>
        <fieldset [disabled]="guardando()">
          <legend>Roles disponibles</legend>
          @for (rol of roles(); track rol.idRol) {
            <label class="choice" [class.chosen]="seleccion().includes(rol.idRol)"
              ><input
                type="checkbox"
                [checked]="seleccion().includes(rol.idRol)"
                (change)="alternar(rol.idRol)"
              />{{ rol.nombre }}</label
            >
          } @empty {
            <p>No hay roles disponibles para asignar.</p>
          }
        </fieldset>
        @if (!seleccion().length) {
          <p class="notice" appAvisoCerrable>La cuenta quedará sin roles asignados.</p>
        }
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </div>
      <footer>
        <button type="button" class="btn" [disabled]="guardando()" (click)="cerrar()">
          Cancelar
        </button>
        <button
          type="button"
          class="btn primary"
          [disabled]="guardando() || !sucio()"
          (click)="guardar.emit(seleccion())"
        >
          {{ guardando() ? 'Guardando…' : 'Guardar roles' }}
        </button>
      </footer>
    </dialog>
  `,
})
export class RolesDialog implements OnInit, AfterViewInit {
  readonly usuario = input.required<Usuario>();
  readonly roles = input.required<Rol[]>();
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly cancelar = output<void>();
  readonly guardar = output<number[]>();
  readonly seleccion = signal<number[]>([]);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly avisos = inject(AvisoService);
  private inicial: number[] = [];
  private confirmando = false;

  ngOnInit() {
    this.inicial = this.usuario().roles.map((r) => r.idRol);
    this.seleccion.set([...this.inicial]);
  }
  ngAfterViewInit() {
    this.dialog().nativeElement.showModal();
  }
  sucio() {
    return !mismosIds(this.inicial, this.seleccion());
  }
  alternar(id: number) {
    if (this.guardando() || this.confirmando) return;
    this.seleccion.update((ids) => (ids.includes(id) ? ids.filter((r) => r !== id) : [...ids, id]));
  }
  async cerrar() {
    if (this.guardando() || this.confirmando) return;
    this.confirmando = true;
    const salir =
      !this.sucio() ||
      (await this.avisos.confirmar({
        titulo: '¿Descartar cambios de roles?',
        mensaje: 'La selección no se ha guardado.',
        textoConfirmar: 'Descartar cambios',
      }));
    this.confirmando = false;
    if (salir) {
      this.dialog().nativeElement.close();
      this.cancelar.emit();
    }
  }
  @HostListener('window:beforeunload', ['$event'])
  proteger(event: BeforeUnloadEvent) {
    if (this.sucio() || this.guardando()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
