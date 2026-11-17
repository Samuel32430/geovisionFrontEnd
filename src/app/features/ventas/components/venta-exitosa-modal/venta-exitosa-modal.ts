import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { VentaResponse } from '../../models/venta.model';
import { Icono } from '../../../../shared/components/icono/icono';

@Component({
  selector: 'app-venta-exitosa-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, Icono],
  templateUrl: './venta-exitosa-modal.html',
  styleUrl: './venta-exitosa-modal.css',
})
export class VentaExitosaModal {
  readonly venta = input.required<VentaResponse>();
  readonly cerrar = output<void>();
  readonly nuevaVenta = output<void>();

  protected imprimir(): void {
    window.print();
  }
}
