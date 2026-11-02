import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
  DestroyRef,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Montura } from '../../models/lente.model';
import { PaginaResponse } from '../../../../core/models/pagina-response';
@Component({
  selector: 'app-montura-selector',
  imports: [DecimalPipe],
  templateUrl: './montura-selector.html',
  styleUrl: './montura-selector.css',
})
export class MonturaSelector {
  readonly pagina = input<PaginaResponse<Montura> | null>(null);
  readonly cargando = input(false);
  readonly error = input('');
  readonly cerrar = output<void>();
  readonly paginar = output<number>();
  readonly elegir = output<Montura>();
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  constructor() {
    afterNextRender(() => this.dialogo().nativeElement.showModal());
    inject(DestroyRef).onDestroy(() => this.dialogo().nativeElement.close());
  }
}
