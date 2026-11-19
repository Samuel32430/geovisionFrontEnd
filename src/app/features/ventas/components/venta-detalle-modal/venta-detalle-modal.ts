import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { VentaResponse } from '../../models/venta.model';
import { Icono } from '../../../../shared/components/icono/icono';
import { VentaService } from '../../services/venta.service';
import { AvisoService } from '../../../../shared/aviso-service';

@Component({
  selector: 'app-venta-detalle-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, Icono],
  templateUrl: './venta-detalle-modal.html',
  styleUrl: './venta-detalle-modal.css',
})
export class VentaDetalleModal {
  private readonly ventaService = inject(VentaService);
  private readonly avisos = inject(AvisoService);

  readonly venta = input.required<VentaResponse>();
  readonly cerrar = output<void>();

  protected readonly descargandoPdf = signal(false);

  protected imprimir(): void {
    const id = this.venta().idVenta;
    if (!id || this.descargandoPdf()) return;
    this.descargandoPdf.set(true);

    this.ventaService.descargarComprobantePdf(id).subscribe({
      next: (blob) => {
        this.ventaService.abrirPdfEnPestana(blob);
        this.descargandoPdf.set(false);
      },
      error: () => {
        this.descargandoPdf.set(false);
        this.avisos.abrir({
          tipo: 'error',
          titulo: 'Error al generar comprobante',
          mensaje: 'No se pudo generar el comprobante oficial en PDF. Intente nuevamente.',
        });
      },
    });
  }
}
