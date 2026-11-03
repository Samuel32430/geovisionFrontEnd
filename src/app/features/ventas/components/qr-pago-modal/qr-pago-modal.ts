import { Component, input, output, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icono } from '../../../../shared/components/icono/icono';

@Component({
  selector: 'app-qr-pago-modal',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, Icono],
  templateUrl: './qr-pago-modal.html',
  styleUrl: './qr-pago-modal.css',
})
export class QrPagoModal {
  readonly monto = input.required<number>();
  readonly cerrar = output<void>();
  readonly confirmar = output<string>();

  protected readonly numeroOperacion = signal('');
  protected readonly billetera = signal<'YAPE' | 'PLIN'>('YAPE');

  protected confirmarPago(): void {
    this.confirmar.emit(this.numeroOperacion().trim());
  }
}
