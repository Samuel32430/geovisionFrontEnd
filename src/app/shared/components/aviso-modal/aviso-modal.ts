import {
  afterRenderEffect,
  Component,
  effect,
  inject,
  viewChild,
  ElementRef,
  signal,
} from '@angular/core';
import { Aviso, AvisoService } from '../../aviso-service';
import { Icono } from '../icono/icono';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-aviso-modal',
  imports: [Icono, NgTemplateOutlet],
  templateUrl: './aviso-modal.html',
  styleUrl: './aviso-modal.css',
})
export class AvisoModal {
  protected readonly avisos = inject(AvisoService);
  // Retain the rendered content while the native dialog finishes its exit transition.
  protected readonly contenido = signal<Aviso | null>(null);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    effect(() => {
      const aviso = this.avisos.actual();
      if (aviso) this.contenido.set(aviso);
    });
    afterRenderEffect(() => {
      const dialogo = this.dialogo().nativeElement;
      if (this.avisos.actual()) {
        if (!dialogo.open) dialogo.showModal();
      } else if (dialogo.open) {
        dialogo.close();
      }
    });
  }

  protected cancelar(event: Event): void {
    event.preventDefault();
    this.avisos.cerrar();
  }
}
