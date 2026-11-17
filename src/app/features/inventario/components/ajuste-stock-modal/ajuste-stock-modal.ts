import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icono } from '../../../../shared/components/icono/icono';
import { AjusteStockRequest, ProductoItem } from '../../models/inventario.model';

@Component({
  selector: 'app-ajuste-stock-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, Icono],
  templateUrl: './ajuste-stock-modal.html',
  styleUrl: './ajuste-stock-modal.css',
})
export class AjusteStockModal {
  readonly producto = input.required<ProductoItem>();
  readonly cerrar = output<void>();
  readonly confirmar = output<AjusteStockRequest>();

  protected readonly tipoAjuste = signal<'INCREMENTO' | 'DECREMENTO'>('DECREMENTO');
  protected readonly cantidad = signal<number>(1);
  protected readonly motivo = signal<number>(2); // 2 = Daño / Rotura por defecto para decremento
  protected readonly observaciones = signal<string>('');
  protected readonly error = signal<string | null>(null);

  protected readonly stockResultante = computed(() => {
    const act = this.producto().stock;
    const cant = this.cantidad() || 0;
    return this.tipoAjuste() === 'INCREMENTO' ? act + cant : act - cant;
  });

  protected setTipo(tipo: 'INCREMENTO' | 'DECREMENTO'): void {
    this.tipoAjuste.set(tipo);
    this.motivo.set(tipo === 'INCREMENTO' ? 1 : 2);
    this.error.set(null);
  }

  protected guardar(): void {
    const cant = this.cantidad();
    if (!cant || cant <= 0) {
      this.error.set('La cantidad del ajuste debe ser mayor a 0.');
      return;
    }

    if (this.tipoAjuste() === 'DECREMENTO' && cant > this.producto().stock) {
      this.error.set(
        `No puedes descontar ${cant} unidades porque el stock actual es de solo ${this.producto().stock}.`
      );
      return;
    }

    const obs = this.observaciones().trim();
    if (!obs || obs.length < 5) {
      this.error.set('Debes ingresar una justificación detallada (mínimo 5 caracteres).');
      return;
    }

    this.confirmar.emit({
      idProducto: this.producto().idProducto,
      cantidad: Math.floor(cant),
      tipoAjuste: this.tipoAjuste(),
      motivo: this.motivo(),
      observaciones: obs,
    });
  }
}
