import { Component, input, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RecetaDetalle } from '../../../atencion-paciente-consulta/models/receta.model';
import { Icono } from '../../../../shared/components/icono/icono';

@Component({
  selector: 'app-receta-asociada-modal',
  standalone: true,
  imports: [CommonModule, DecimalPipe, Icono],
  templateUrl: './receta-asociada-modal.html',
  styleUrl: './receta-asociada-modal.css',
})
export class RecetaAsociadaModal {
  readonly receta = input<RecetaDetalle | null>(null);
  readonly cerrar = output<void>();
  readonly usarReceta = output<RecetaDetalle>();

  protected confirmarUso(): void {
    const r = this.receta();
    if (r) {
      this.usarReceta.emit(r);
    }
  }
}
