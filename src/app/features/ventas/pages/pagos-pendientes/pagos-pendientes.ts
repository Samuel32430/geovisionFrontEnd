import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icono } from '../../../../shared/components/icono/icono';
import { AvisoService } from '../../../../shared/aviso-service';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import { PagoPendienteItem, PagoPendienteRequest } from '../../models/pago-pendiente.model';
import { PagoPendienteService } from '../../services/pago-pendiente.service';
import { RegistrarAbonoModal } from '../../components/registrar-abono-modal/registrar-abono-modal';

@Component({
  selector: 'app-pagos-pendientes',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, Icono, RegistrarAbonoModal],
  templateUrl: './pagos-pendientes.html',
  styleUrl: './pagos-pendientes.css',
})
export class PagosPendientes implements OnInit {
  private readonly pagoPendienteService = inject(PagoPendienteService);
  private readonly avisos = inject(AvisoService);

  protected readonly termino = signal('');
  protected readonly cuentas = signal<PagoPendienteItem[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly cuentaSeleccionada = signal<PagoPendienteItem | null>(null);

  // Métricas reactivas
  protected readonly totalOrdenes = computed(() => this.cuentas().length);
  protected readonly totalDeuda = computed(() =>
    this.cuentas().reduce((acc, c) => acc + c.saldoPendiente, 0),
  );

  ngOnInit(): void {
    this.cargarCuentas();
  }

  protected cargarCuentas(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.pagoPendienteService.listar(this.termino()).subscribe({
      next: (data) => {
        this.cuentas.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeErrorHttp(err));
        this.cargando.set(false);
      },
    });
  }

  protected limpiarFiltro(): void {
    this.termino.set('');
    this.cargarCuentas();
  }

  protected iniciarCobro(cuenta: PagoPendienteItem): void {
    this.cuentaSeleccionada.set(cuenta);
  }

  protected procesarAbono(request: PagoPendienteRequest): void {
    this.guardando.set(true);
    this.pagoPendienteService.registrarPago(request).subscribe({
      next: (pago) => {
        this.guardando.set(false);
        this.cuentaSeleccionada.set(null);
        this.avisos.abrir({
          titulo: 'Pago registrado con éxito',
          mensaje: `Se registró el abono de S/ ${pago.monto.toFixed(2)} correctamente para la venta #${request.idVenta}.`,
        });
        this.cargarCuentas();
      },
      error: (err) => {
        this.guardando.set(false);
        this.avisos.abrir({
          titulo: 'Error al registrar pago',
          mensaje: mensajeErrorHttp(err),
        });
      },
    });
  }

  protected iniciales(nombre: string): string {
    return (nombre || 'C')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toLocaleUpperCase('es');
  }
}
