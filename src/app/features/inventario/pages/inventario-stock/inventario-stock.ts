import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icono } from '../../../../shared/components/icono/icono';
import { AvisoService } from '../../../../shared/aviso-service';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import { InventarioService } from '../../services/inventario.service';
import {
  AjusteStockRequest,
  EntradaStockRequest,
  ProductoItem,
  ProductoRequest,
} from '../../models/inventario.model';
import { EntradaStockModal } from '../../components/entrada-stock-modal/entrada-stock-modal';
import { AjusteStockModal } from '../../components/ajuste-stock-modal/ajuste-stock-modal';
import { KardexModal } from '../../components/kardex-modal/kardex-modal';
import { ProductoModal } from '../../components/producto-modal/producto-modal';

@Component({
  selector: 'app-inventario-stock',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    Icono,
    EntradaStockModal,
    AjusteStockModal,
    KardexModal,
    ProductoModal,
  ],
  templateUrl: './inventario-stock.html',
  styleUrl: './inventario-stock.css',
})
export class InventarioStock implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly avisos = inject(AvisoService);

  // Filtros
  protected readonly termino = signal('');
  protected readonly idCategoria = signal<number | null>(null);
  protected readonly estadoFiltro = signal<number | null>(null);
  protected readonly soloAlertas = signal(false);

  // Datos
  protected readonly productos = signal<ProductoItem[]>([]);
  protected readonly alertasBajoStock = signal<ProductoItem[]>([]);
  protected readonly cargando = signal(false);
  protected readonly paginaActual = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalElementos = signal(0);
  protected readonly pageSize = signal(10);

  // Modales
  protected readonly productoParaEntrada = signal<ProductoItem | null>(null);
  protected readonly productoParaAjuste = signal<ProductoItem | null>(null);
  protected readonly productoParaKardex = signal<ProductoItem | null>(null);
  protected readonly productoParaEditar = signal<ProductoItem | null>(null);
  protected readonly modalProductoAbierto = signal(false);

  // Métricas calculadas
  protected readonly totalStockUnidades = computed(() =>
    this.productos().reduce((acc, p) => acc + (p.stock || 0), 0)
  );

  ngOnInit(): void {
    this.cargarInventario(0);
    this.cargarAlertas();
  }

  protected cargarInventario(page = 0): void {
    this.cargando.set(true);
    this.inventarioService
      .listarProductos({
        termino: this.termino(),
        idCategoria: this.idCategoria(),
        estado: this.estadoFiltro(),
        page,
        size: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.productos.set(res.content || []);
          this.paginaActual.set(res.number ?? page);
          this.totalPaginas.set(res.totalPages ?? 1);
          this.totalElementos.set(res.totalElements ?? (res.content?.length || 0));
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.avisos.abrir({
            titulo: 'Error al consultar inventario',
            mensaje: mensajeErrorHttp(err),
            tipo: 'error',
          });
        },
      });
  }

  protected cargarAlertas(): void {
    this.inventarioService.listarAlertasBajoStock(5).subscribe({
      next: (alertas) => this.alertasBajoStock.set(alertas || []),
      error: () => {},
    });
  }

  protected buscar(): void {
    this.cargarInventario(0);
  }

  protected limpiarFiltros(): void {
    this.termino.set('');
    this.idCategoria.set(null);
    this.estadoFiltro.set(null);
    this.soloAlertas.set(false);
    this.cargarInventario(0);
  }

  protected cambiarPagina(delta: number): void {
    const nueva = this.paginaActual() + delta;
    if (nueva >= 0 && nueva < this.totalPaginas()) {
      this.cargarInventario(nueva);
    }
  }

  // --- Manejo de Entradas ---
  protected abrirEntrada(p: ProductoItem): void {
    this.productoParaEntrada.set(p);
  }

  protected confirmarEntrada(req: EntradaStockRequest): void {
    this.cargando.set(true);
    this.inventarioService.registrarEntrada(req).subscribe({
      next: (res) => {
        this.productoParaEntrada.set(null);
        this.avisos.abrir({
          titulo: 'Entrada Registrada',
          mensaje: `Se ingresaron ${res.cantidad} unidades al producto "${res.nombreProducto}". Nuevo stock: ${res.stockPosterior}.`,
          tipo: 'exito',
        });
        this.cargarInventario(this.paginaActual());
        this.cargarAlertas();
      },
      error: (err) => {
        this.cargando.set(false);
        this.avisos.abrir({
          titulo: 'Error al registrar entrada',
          mensaje: mensajeErrorHttp(err),
          tipo: 'error',
        });
      },
    });
  }

  // --- Manejo de Ajustes ---
  protected abrirAjuste(p: ProductoItem): void {
    this.productoParaAjuste.set(p);
  }

  protected confirmarAjuste(req: AjusteStockRequest): void {
    this.cargando.set(true);
    this.inventarioService.registrarAjuste(req).subscribe({
      next: (res) => {
        this.productoParaAjuste.set(null);
        this.avisos.abrir({
          titulo: 'Ajuste Aplicado',
          mensaje: `Ajuste (${req.tipoAjuste}) registrado. Stock resultante: ${res.stockPosterior} unidades.`,
          tipo: 'exito',
        });
        this.cargarInventario(this.paginaActual());
        this.cargarAlertas();
      },
      error: (err) => {
        this.cargando.set(false);
        this.avisos.abrir({
          titulo: 'Error al aplicar ajuste',
          mensaje: mensajeErrorHttp(err),
          tipo: 'error',
        });
      },
    });
  }

  // --- Kardex ---
  protected abrirKardex(p: ProductoItem): void {
    this.productoParaKardex.set(p);
  }

  // --- Crear / Editar Producto ---
  protected abrirNuevoProducto(): void {
    this.productoParaEditar.set(null);
    this.modalProductoAbierto.set(true);
  }

  protected abrirEditarProducto(p: ProductoItem): void {
    this.productoParaEditar.set(p);
    this.modalProductoAbierto.set(true);
  }

  protected guardarProducto(req: ProductoRequest): void {
    this.cargando.set(true);
    const editar = this.productoParaEditar();

    const accion$ = editar
      ? this.inventarioService.actualizarProducto(editar.idProducto, req)
      : this.inventarioService.registrarProducto(req);

    accion$.subscribe({
      next: (p) => {
        this.modalProductoAbierto.set(false);
        this.productoParaEditar.set(null);
        this.avisos.abrir({
          titulo: editar ? 'Producto Actualizado' : 'Producto Registrado',
          mensaje: `El producto "${p.nombre}" (${p.codigo}) fue ${editar ? 'actualizado' : 'registrado'} correctamente.`,
          tipo: 'exito',
        });
        this.cargarInventario(this.paginaActual());
        this.cargarAlertas();
      },
      error: (err) => {
        this.cargando.set(false);
        this.avisos.abrir({
          titulo: 'Error al guardar producto',
          mensaje: mensajeErrorHttp(err),
          tipo: 'error',
        });
      },
    });
  }

  // --- Cambiar Estado (Activar / Desactivar) ---
  protected async alternarEstado(p: ProductoItem): Promise<void> {
    const nuevoEstado = p.estado === 1 ? 0 : 1;
    const accion = nuevoEstado === 1 ? 'activar' : 'desactivar';

    const confirmado = await this.avisos.confirmar({
      titulo: `¿${accion.toUpperCase()} producto?`,
      mensaje: `¿Estás seguro de ${accion} el producto "${p.nombre}" para ventas?`,
      textoConfirmar: accion.toUpperCase(),
    });

    if (!confirmado) return;

    this.cargando.set(true);
    this.inventarioService.cambiarEstadoProducto(p.idProducto, nuevoEstado).subscribe({
      next: () => {
        this.avisos.abrir({
          titulo: 'Estado Actualizado',
          mensaje: `El producto fue ${nuevoEstado === 1 ? 'activado' : 'desactivado'} exitosamente.`,
          tipo: 'exito',
        });
        this.cargarInventario(this.paginaActual());
      },
      error: (err) => {
        this.cargando.set(false);
        this.avisos.abrir({
          titulo: 'Error al cambiar estado',
          mensaje: mensajeErrorHttp(err),
          tipo: 'error',
        });
      },
    });
  }
}
