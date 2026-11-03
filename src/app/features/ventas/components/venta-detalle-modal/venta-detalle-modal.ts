import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { VentaResponse } from '../../models/venta.model';
import { Icono } from '../../../../shared/components/icono/icono';

@Component({
  selector: 'app-venta-detalle-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, Icono],
  templateUrl: './venta-detalle-modal.html',
  styleUrl: './venta-detalle-modal.css',
})
export class VentaDetalleModal {
  readonly venta = input.required<VentaResponse>();
  readonly cerrar = output<void>();

  protected imprimir(): void {
    window.print();
  }
}
