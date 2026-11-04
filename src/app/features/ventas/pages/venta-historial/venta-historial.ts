import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icono } from '../../../../shared/components/icono/icono';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import {
  ConsultaHistorialVentas,
  VentaHistorialItem,
  VentaResponse,
} from '../../models/venta.model';
import { VentaService } from '../../services/venta.service';
import { VentaDetalleModal } from '../../components/venta-detalle-modal/venta-detalle-modal';

@Component({
  selector: 'app-venta-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, RouterLink, Icono, VentaDetalleModal],
  templateUrl: './venta-historial.html',
  styleUrl: './venta-historial.css',
})
export class VentaHistorial implements OnInit {
  private readonly ventaService = inject(VentaService);

  // Filtros
  protected readonly termino = signal('');
  protected readonly estadoFiltro = signal<number>(-1);
  protected readonly fechaInicio = signal('');
  protected readonly fechaFin = signal('');
  protected readonly pagina = signal(0);
  protected readonly tamanio = signal(10);

  // Datos
  protected readonly ventas = signal<VentaHistorialItem[]>([]);
  protected readonly totalElementos = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  // Modal detalle
  protected readonly ventaSeleccionada = signal<VentaResponse | null>(null);
  protected readonly cargandoDetalle = signal(false);

  // Páginas visibles
  protected readonly numerosPagina = computed(() => {
    const total = this.totalPaginas();
    const actual = this.pagina();
    const inicio = Math.max(0, Math.min(actual - 2, total - 5));
    return Array.from({ length: Math.min(5, Math.max(0, total - inicio)) }, (_, i) => inicio + i);
  });

  ngOnInit(): void {
    this.cargarVentas();
  }

  protected cargarVentas(): void {
    this.cargando.set(true);
    this.error.set(null);

    const consulta: ConsultaHistorialVentas = {
      termino: this.termino(),
      estado: this.estadoFiltro() > 0 ? this.estadoFiltro() : null,
      fechaInicio: this.fechaInicio() ? `${this.fechaInicio()}T00:00:00` : null,
      fechaFin: this.fechaFin() ? `${this.fechaFin()}T23:59:59` : null,
      page: this.pagina(),
      size: this.tamanio(),
    };

    this.ventaService.historial(consulta).subscribe({
      next: (res) => {
        this.ventas.set(res.content);
        this.totalElementos.set(res.totalElements);
        this.totalPaginas.set(res.totalPages);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeErrorHttp(err));
        this.cargando.set(false);
      },
    });
  }

  protected cambiarPagina(p: number): void {
    if (p >= 0 && p < this.totalPaginas() && p !== this.pagina()) {
      this.pagina.set(p);
      this.cargarVentas();
    }
  }

  protected limpiarFiltros(): void {
    this.termino.set('');
    this.estadoFiltro.set(-1);
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.pagina.set(0);
    this.cargarVentas();
  }

  protected abrirDetalle(idVenta: number): void {
    this.cargandoDetalle.set(true);
    this.ventaService.detalleHistorial(idVenta).subscribe({
      next: (detalle) => {
        this.ventaSeleccionada.set(detalle);
        this.cargandoDetalle.set(false);
      },
      error: (err) => {
        this.cargandoDetalle.set(false);
        this.error.set(mensajeErrorHttp(err));
      },
    });
  }

  protected iniciales(nombre: string): string {
    return (nombre || 'PG')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toLocaleUpperCase('es');
  }
}
