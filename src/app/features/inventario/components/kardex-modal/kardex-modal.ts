import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Icono } from '../../../../shared/components/icono/icono';
import { MovimientoStockResponse, ProductoItem } from '../../models/inventario.model';
import { InventarioService } from '../../services/inventario.service';

@Component({
  selector: 'app-kardex-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, Icono],
  templateUrl: './kardex-modal.html',
  styleUrl: './kardex-modal.css',
})
export class KardexModal implements OnInit {
  private readonly inventarioService = inject(InventarioService);

  readonly producto = input.required<ProductoItem>();
  readonly cerrar = output<void>();

  protected readonly cargando = signal(true);
  protected readonly movimientos = signal<MovimientoStockResponse[]>([]);
  protected readonly paginaActual = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalElementos = signal(0);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarKardex(0);
  }

  protected cargarKardex(page: number): void {
    this.cargando.set(true);
    this.error.set(null);

    this.inventarioService
      .listarMovimientosKardex(this.producto().idProducto, page, 8)
      .subscribe({
        next: (res) => {
          this.movimientos.set(res.content || []);
          this.paginaActual.set(res.number ?? page);
          this.totalPaginas.set(res.totalPages ?? 1);
          this.totalElementos.set(res.totalElements ?? (res.content?.length || 0));
          this.cargando.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Error al cargar el historial Kardex.');
          this.cargando.set(false);
        },
      });
  }

  protected cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 0 && nueva < this.totalPaginas()) {
      this.cargarKardex(nueva);
    }
  }
}
