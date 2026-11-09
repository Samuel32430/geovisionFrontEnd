import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icono } from '../../../../shared/components/icono/icono';
import { AvisoService } from '../../../../shared/aviso-service';
import { ReporteVentasService } from '../../services/reporte-ventas.service';
import { VentaService } from '../../services/venta.service';
import {
  FiltroReporteVentas,
  ItemRankingComercial,
  ItemVentaReporte,
  ReporteRankingComercial,
  ReporteVentasPeriodo,
} from '../../models/reporte-ventas.model';
import { VentaResponse } from '../../models/venta.model';
import { VentaDetalleModal } from '../../components/venta-detalle-modal/venta-detalle-modal';

@Component({
  selector: 'app-reporte-ventas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    Icono,
    VentaDetalleModal,
  ],
  templateUrl: './reporte-ventas.html',
  styleUrl: './reporte-ventas.css',
})
export class ReporteVentas implements OnInit {
  protected readonly reporteService = inject(ReporteVentasService);
  protected readonly ventaService = inject(VentaService);
  protected readonly avisos = inject(AvisoService);

  // Control de Solapa Activa
  protected readonly pestanaActiva = signal<'periodo' | 'ranking' | 'saldos'>('periodo');

  // Estados de carga y error
  protected readonly cargando = signal(false);
  protected readonly descargandoPdf = signal(false);
  protected readonly error = signal<string | null>(null);

  // Modal de Detalle de Venta
  protected readonly ventaSeleccionada = signal<VentaResponse | null>(null);
  protected readonly cargandoDetalle = signal(false);

  // Filtros reactivos
  protected readonly fechaInicio = signal(this.calcularPrimerDiaMes());
  protected readonly fechaFin = signal(this.calcularHoy());
  protected readonly tipoComprobante = signal<string>('TODOS');
  protected readonly estadoFiltro = signal<string>('TODOS');

  // Datos de Reporte 1: Ventas por Periodo
  protected readonly reportePeriodo = signal<ReporteVentasPeriodo | null>(null);

  // Datos de Reporte 2: Ranking Comercial
  protected readonly reporteRanking = signal<ReporteRankingComercial | null>(null);
  protected readonly fechaInicioRanking = signal(this.calcularPrimerDiaMes());
  protected readonly fechaFinRanking = signal(this.calcularHoy());

  // Lista de métodos de pago calculados
  protected readonly metodosPago = computed(() => {
    const rep = this.reportePeriodo();
    if (!rep || !rep.totalPorMetodoPago) return [];
    return Object.entries(rep.totalPorMetodoPago).map(([nombre, monto]) => ({
      nombre,
      monto,
      porcentaje:
        rep.totalCobrado > 0
          ? Math.round((Number(monto) / Number(rep.totalCobrado)) * 100)
          : 0,
    }));
  });

  ngOnInit(): void {
    this.cargarReportePeriodo();
  }

  protected cambiarPestana(pestana: 'periodo' | 'ranking' | 'saldos'): void {
    this.pestanaActiva.set(pestana);
    this.error.set(null);
    if (pestana === 'periodo') {
      if (!this.reportePeriodo()) this.cargarReportePeriodo();
    } else if (pestana === 'ranking') {
      if (!this.reporteRanking()) this.cargarReporteRanking();
    }
  }

  protected cargarReportePeriodo(): void {
    this.cargando.set(true);
    this.error.set(null);

    const filtro: FiltroReporteVentas = {
      fechaInicio: this.fechaInicio() || undefined,
      fechaFin: this.fechaFin() || undefined,
      tipoComprobante:
        this.tipoComprobante() !== 'TODOS'
          ? (this.tipoComprobante() as any)
          : undefined,
      estado:
        this.estadoFiltro() !== 'TODOS'
          ? (this.estadoFiltro() as any)
          : undefined,
    };

    this.reporteService.obtenerReportePeriodo(filtro).subscribe({
      next: (res) => {
        this.reportePeriodo.set(res);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(
          err?.error?.message || 'Ocurrió un error al cargar el reporte de ventas por periodo.'
        );
      },
    });
  }

  protected exportarPdfPeriodo(): void {
    if (this.descargandoPdf()) return;
    this.descargandoPdf.set(true);

    const filtro: FiltroReporteVentas = {
      fechaInicio: this.fechaInicio() || undefined,
      fechaFin: this.fechaFin() || undefined,
      tipoComprobante:
        this.tipoComprobante() !== 'TODOS'
          ? (this.tipoComprobante() as any)
          : undefined,
      estado:
        this.estadoFiltro() !== 'TODOS'
          ? (this.estadoFiltro() as any)
          : undefined,
    };

    this.reporteService.descargarReportePeriodoPdf(filtro).subscribe({
      next: (blob) => {
        this.reporteService.abrirPdfEnPestana(blob);
        this.descargandoPdf.set(false);
      },
      error: () => {
        this.descargandoPdf.set(false);
        this.avisos.abrir({
          tipo: 'error',
          titulo: 'Error al exportar PDF',
          mensaje: 'No se pudo descargar el reporte PDF. Verifique su conexión con el servidor.',
        });
      },
    });
  }

  protected cargarReporteRanking(): void {
    this.cargando.set(true);
    this.error.set(null);

    const filtro: FiltroReporteVentas = {
      fechaInicio: this.fechaInicioRanking() || undefined,
      fechaFin: this.fechaFinRanking() || undefined,
    };

    this.reporteService.obtenerRankingComercial(filtro).subscribe({
      next: (res) => {
        this.reporteRanking.set(res);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(
          err?.error?.message || 'Ocurrió un error al cargar el ranking comercial.'
        );
      },
    });
  }

  protected exportarPdfRanking(): void {
    if (this.descargandoPdf()) return;
    this.descargandoPdf.set(true);

    const filtro: FiltroReporteVentas = {
      fechaInicio: this.fechaInicioRanking() || undefined,
      fechaFin: this.fechaFinRanking() || undefined,
    };

    this.reporteService.descargarRankingComercialPdf(filtro).subscribe({
      next: (blob) => {
        this.reporteService.abrirPdfEnPestana(blob);
        this.descargandoPdf.set(false);
      },
      error: () => {
        this.descargandoPdf.set(false);
        this.avisos.abrir({
          tipo: 'error',
          titulo: 'Error al exportar PDF',
          mensaje: 'No se pudo descargar el PDF de ranking comercial. Verifique su conexión.',
        });
      },
    });
  }

  protected limpiarFiltrosRanking(): void {
    this.fechaInicioRanking.set(this.calcularPrimerDiaMes());
    this.fechaFinRanking.set(this.calcularHoy());
    this.cargarReporteRanking();
  }

  protected abrirDetalleVenta(v: ItemVentaReporte): void {
    this.cargandoDetalle.set(true);
    this.ventaService.detalleHistorial(v.idVenta).subscribe({
      next: (resp) => {
        this.ventaSeleccionada.set(resp);
        this.cargandoDetalle.set(false);
      },
      error: () => {
        this.cargandoDetalle.set(false);
        this.avisos.abrir({
          tipo: 'error',
          titulo: 'Detalle de venta',
          mensaje: 'No se pudo cargar el detalle de la venta solicitada.',
        });
      },
    });
  }

  protected cerrarModalDetalle(): void {
    this.ventaSeleccionada.set(null);
  }

  protected limpiarFiltros(): void {
    this.fechaInicio.set(this.calcularPrimerDiaMes());
    this.fechaFin.set(this.calcularHoy());
    this.tipoComprobante.set('TODOS');
    this.estadoFiltro.set('TODOS');
    this.cargarReportePeriodo();
  }

  protected iniciales(nombre?: string | null): string {
    if (!nombre) return 'PG';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  private calcularPrimerDiaMes(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-01`;
  }

  private calcularHoy(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }
}
