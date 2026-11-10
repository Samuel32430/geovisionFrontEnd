import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icono } from '../../../../shared/components/icono/icono';
import { VentaService } from '../../services/venta.service';

@Component({
  selector: 'app-qr-pago-modal',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, Icono],
  templateUrl: './qr-pago-modal.html',
  styleUrl: './qr-pago-modal.css',
})
export class QrPagoModal implements OnInit {
  private readonly ventaService = inject(VentaService);

  readonly monto = input.required<number>();
  readonly idVenta = input<number | null>(null);
  readonly descripcion = input<string>('Cobro de Venta GeoVision');

  readonly cerrar = output<void>();
  readonly confirmar = output<string>();

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly qrData = signal<string | null>(null);
  protected readonly qrImageUrl = signal<string | null>(null);
  protected readonly numeroOperacion = signal('');
  protected readonly billetera = signal<'YAPE' | 'PLIN'>('YAPE');

  ngOnInit(): void {
    this.cargarOrdenQr();
  }

  protected cargarOrdenQr(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.ventaService
      .generarOrdenQr({
        idVenta: this.idVenta(),
        monto: this.monto(),
        descripcion: this.descripcion(),
      })
      .subscribe({
        next: (res) => {
          this.qrData.set(res.qrData);
          this.qrImageUrl.set(res.qrImageUrl ?? null);
          this.cargando.set(false);
        },
        error: (err) => {
          const mensaje =
            err?.error?.mensaje ??
            err?.message ??
            'No se pudo generar el código QR dinámico. Intente nuevamente.';
          this.error.set(mensaje);
          this.cargando.set(false);
        },
      });
  }

  protected reintentar(): void {
    this.cargarOrdenQr();
  }

  protected confirmarPago(): void {
    this.confirmar.emit(this.numeroOperacion().trim());
  }
}
