import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icono } from '../../../../shared/components/icono/icono';
import { MetodoPago, requiereVoucher } from '../../models/venta.model';
import { PagoPendienteItem, PagoPendienteRequest } from '../../models/pago-pendiente.model';

@Component({
  selector: 'app-registrar-abono-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, Icono],
  templateUrl: './registrar-abono-modal.html',
  styleUrl: './registrar-abono-modal.css',
})
export class RegistrarAbonoModal {
  readonly cuenta = input.required<PagoPendienteItem>();
  readonly cerrar = output<void>();
  readonly confirmar = output<PagoPendienteRequest>();

  protected readonly monto = signal<number>(0);
  protected readonly medioPago = signal<MetodoPago>('EFECTIVO');
  protected readonly numeroOperacion = signal('');
  protected readonly error = signal<string | null>(null);

  protected readonly saldoTotal = computed(() => this.cuenta().saldoPendiente);

  constructor() {
    // Se predetermina el saldo completo
    setTimeout(() => {
      this.monto.set(this.saldoTotal());
    });
  }

  protected setMontoCompleto(): void {
    this.monto.set(this.saldoTotal());
  }

  protected setMontoMitad(): void {
    this.monto.set(Math.round((this.saldoTotal() / 2) * 100) / 100);
  }

  protected confirmarAbono(): void {
    const val = this.monto();
    if (!val || val <= 0) {
      this.error.set('El monto a cobrar debe ser mayor a cero.');
      return;
    }
    if (val > this.saldoTotal()) {
      this.error.set(
        `El monto (S/ ${val.toFixed(2)}) no puede exceder el saldo restante (S/ ${this.saldoTotal().toFixed(2)}).`,
      );
      return;
    }

    const metodo = this.medioPago();
    if (requiereVoucher(metodo) && !this.numeroOperacion().trim()) {
      this.error.set('El número de voucher/operación es obligatorio para pagos con tarjeta o transferencia.');
      return;
    }

    this.error.set(null);
    this.confirmar.emit({
      idVenta: this.cuenta().idVenta,
      monto: val,
      metodoPago: metodo,
      numeroOperacion: this.numeroOperacion().trim() || null,
    });
  }
}
