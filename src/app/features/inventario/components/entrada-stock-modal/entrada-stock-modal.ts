import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icono } from '../../../../shared/components/icono/icono';
import { EntradaStockRequest, ProductoItem } from '../../models/inventario.model';

@Component({
  selector: 'app-entrada-stock-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, Icono],
  templateUrl: './entrada-stock-modal.html',
  styleUrl: './entrada-stock-modal.css',
})
export class EntradaStockModal {
  readonly producto = input.required<ProductoItem>();
  readonly cerrar = output<void>();
  readonly confirmar = output<EntradaStockRequest>();

  protected readonly cantidad = signal<number>(1);
  protected readonly motivo = signal<number>(1); // 1 = Compra a proveedor
  protected readonly observaciones = signal<string>('');
  protected readonly error = signal<string | null>(null);

  protected guardar(): void {
    const cant = this.cantidad();
    if (!cant || cant <= 0) {
      this.error.set('La cantidad a ingresar debe ser mayor a 0.');
      return;
    }

    this.confirmar.emit({
      idProducto: this.producto().idProducto,
      cantidad: Math.floor(cant),
      motivo: this.motivo(),
      observaciones: this.observaciones().trim() || undefined,
    });
  }
}
