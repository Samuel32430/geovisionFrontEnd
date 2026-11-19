import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Icono } from '../../../../shared/components/icono/icono';
import { AvisoService } from '../../../../shared/aviso-service';
import { SesionService } from '../../../../core/auth/sesion-service';
import { mensajeErrorHttp } from '../../../../core/utils/http-error';
import { PacienteService } from '../../../atencion-paciente-consulta/services/paciente';
import { RecetaService } from '../../../atencion-paciente-consulta/services/receta';
import { Paciente } from '../../../atencion-paciente-consulta/models/paciente.model';
import { RecetaDetalle, RecetaResumen } from '../../../atencion-paciente-consulta/models/receta.model';
import { Montura } from '../../../atencion-paciente-consulta/models/lente.model';
import {
  MetodoPago,
  PagoRegistroRequest,
  ProductoVendidoRequest,
  ServicioCatalogo,
  ServicioVendidoRequest,
  TipoComprobante,
  VentaRegistroRequest,
  VentaResponse,
  requiereVoucher,
} from '../../models/venta.model';
import { VentaService } from '../../services/venta.service';
import { RecetaAsociadaModal } from '../../components/receta-asociada-modal/receta-asociada-modal';
import { QrPagoModal } from '../../components/qr-pago-modal/qr-pago-modal';
import { VentaExitosaModal } from '../../components/venta-exitosa-modal/venta-exitosa-modal';

export interface CartItem {
  idProducto?: number;
  idServicio?: number;
  nombre: string;
  tipo: 'Montura' | 'Lunas Graduadas' | 'Accesorio' | 'Servicio';
  cantidad: number;
  precioUnit: number;
  asociadoReceta?: boolean;
}

@Component({
  selector: 'app-nueva-venta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    Icono,
    RecetaAsociadaModal,
    QrPagoModal,
    VentaExitosaModal,
  ],
  templateUrl: './nueva-venta.html',
  styleUrl: './nueva-venta.css',
})
export class NuevaVenta {
  private readonly ventaService = inject(VentaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly recetaService = inject(RecetaService);
  private readonly avisos = inject(AvisoService);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  // Cliente / Paciente
  protected readonly modoCliente = signal<'PUBLICO_GENERAL' | 'PACIENTE'>('PUBLICO_GENERAL');
  protected readonly busquedaPaciente = signal('');
  protected readonly buscandoPacientes = signal(false);
  protected readonly pacientesEncontrados = signal<Paciente[]>([]);
  protected readonly pacienteSeleccionado = signal<Paciente | null>(null);

  // Receta Oftalmológica
  protected readonly recetaDetalle = signal<RecetaDetalle | null>(null);
  protected readonly recetasRecientes = signal<RecetaResumen[]>([]);
  protected readonly cargandoReceta = signal(false);
  protected readonly modalRecetaAbierto = signal(false);

  // Catálogo de Productos y Servicios
  protected readonly busquedaItem = signal('');
  protected readonly buscandoItems = signal(false);
  protected readonly monturasCatalogo = signal<Montura[]>([]);
  protected readonly serviciosCatalogo = signal<ServicioCatalogo[]>([]);

  // Buscador de Catálogo (Productos y Servicios)
  protected readonly terminoBusqueda = signal('');
  protected readonly buscandoCatalogo = signal(false);
  protected readonly resultadosBusqueda = signal<
    Array<{
      idProducto?: number;
      idServicio?: number;
      codigo?: string;
      nombre: string;
      tipo: string;
      precio: number;
      stock?: number;
    }>
  >([]);

  // Carrito de compras
  protected readonly carrito = signal<CartItem[]>([]);
  protected readonly total = computed(() =>
    this.carrito().reduce((acc, item) => acc + item.cantidad * item.precioUnit, 0),
  );

  // Comprobante y Cobro
  protected readonly tipoComprobante = signal<TipoComprobante>('BOLETA');
  protected readonly ruc = signal('');
  protected readonly razonSocial = signal('');

  protected readonly modalidadPago = signal<'COMPLETO' | 'ADELANTO'>('COMPLETO');
  protected readonly montoAdelanto = signal<number | null>(null);
  protected readonly fechaEntrega = signal('');

  // Fecha mínima prometida de entrega (a partir de mañana)
  protected readonly fechaEntregaMinima = computed(() => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const anio = manana.getFullYear();
    const mes = String(manana.getMonth() + 1).padStart(2, '0');
    const dia = String(manana.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  });

  protected readonly medioPago = signal<MetodoPago>('EFECTIVO');
  protected readonly numeroOperacion = signal('');

  // Modales
  protected readonly modalQrAbierto = signal(false);
  protected readonly ventaExitosa = signal<VentaResponse | null>(null);

  // Estados
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  // Adelanto mínimo permitido (25% del total si hay receta)
  protected readonly adelantoMinimo = computed(() => {
    return Math.round(this.total() * 0.25 * 100) / 100;
  });

  // Saldo restante calculado
  protected readonly saldoPendiente = computed(() => {
    if (this.modalidadPago() === 'COMPLETO') return 0;
    const adelanto = this.montoAdelanto() || 0;
    return Math.max(0, Math.round((this.total() - adelanto) * 100) / 100);
  });

  constructor() {
    this.cargarCatalogoMonturas();
    this.cargarCatalogoServicios();
  }

  protected seleccionarPublicoGeneral(): void {
    this.modoCliente.set('PUBLICO_GENERAL');
    this.pacienteSeleccionado.set(null);
    this.desvincularReceta();
  }

  protected activarBusquedaPaciente(): void {
    this.modoCliente.set('PACIENTE');
  }

  protected buscarPaciente(termino: string): void {
    this.busquedaPaciente.set(termino);
    if (!termino.trim() || termino.trim().length < 2) {
      this.pacientesEncontrados.set([]);
      return;
    }
    this.buscandoPacientes.set(true);
    this.pacienteService
      .listar({ termino: termino.trim(), estado: 1, page: 0, size: 5 })
      .subscribe({
        next: (res) => {
          this.pacientesEncontrados.set(res.content);
          this.buscandoPacientes.set(false);
        },
        error: () => {
          this.pacientesEncontrados.set([]);
          this.buscandoPacientes.set(false);
        },
      });
  }

  protected elegirPaciente(p: Paciente): void {
    this.pacienteSeleccionado.set(p);
    this.pacientesEncontrados.set([]);
    this.busquedaPaciente.set('');
    this.verificarRecetasPaciente(p.idPersona);
  }

  protected deseleccionarPaciente(): void {
    this.pacienteSeleccionado.set(null);
    this.desvincularReceta();
  }

  private verificarRecetasPaciente(idPaciente: number): void {
    this.cargandoReceta.set(true);
    this.recetaService.recientes(idPaciente).subscribe({
      next: (res) => {
        this.recetasRecientes.set(res.content);
        if (res.content.length > 0) {
          this.recetaService.obtener(res.content[0].idReceta).subscribe({
            next: (detalle) => {
              this.recetaDetalle.set(detalle);
              this.cargandoReceta.set(false);
            },
            error: () => this.cargandoReceta.set(false),
          });
        } else {
          this.recetaDetalle.set(null);
          this.cargandoReceta.set(false);
        }
      },
      error: () => this.cargandoReceta.set(false),
    });
  }

  protected aplicarRecetaAlCarrito(receta: RecetaDetalle): void {
    this.recetaDetalle.set(receta);
    this.modalRecetaAbierto.set(false);

    const idServicioConfeccion = this.obtenerIdServicioConfeccion();
    const servicioInfo = this.serviciosCatalogo().find((s) => s.id === idServicioConfeccion);
    const precioBaseConfeccion = servicioInfo?.precio ?? 200;

    // Si la receta tiene lentes configurados, cargarlos (filtrando previos de receta si los hubiera)
    const items = this.carrito().filter((i) => !i.asociadoReceta);
    if (receta.lentes && receta.lentes.length > 0) {
      for (const lente of receta.lentes) {
        items.push({
          idServicio: idServicioConfeccion,
          nombre: `Lunas Graduadas (${lente.nombreMaterialCristal || 'Básico'}) - ${receta.nombreCompletoPaciente}`,
          tipo: 'Lunas Graduadas',
          cantidad: 1,
          precioUnit: lente.subTotal || precioBaseConfeccion,
          asociadoReceta: true,
        });
        if (lente.nombreMontura) {
          const monturaCatalogo =
            this.monturasCatalogo().find((m) => m.idProducto === (lente as any).idProductoMontura) ??
            this.monturasCatalogo().find((m) => m.codigo === lente.codigoMontura);
          const precioMonturaReal =
            lente.precioMontura ??
            monturaCatalogo?.precio ??
            320;
          const idProd = (lente as any).idProductoMontura ?? monturaCatalogo?.idProducto;
          items.push({
            idProducto: idProd || undefined,
            nombre: `Montura: ${lente.codigoMontura ? lente.codigoMontura + ' - ' : ''}${lente.nombreMontura}`,
            tipo: 'Montura',
            cantidad: 1,
            precioUnit: precioMonturaReal,
            asociadoReceta: true,
          });
        }
      }
    } else {
      items.push({
        idServicio: idServicioConfeccion,
        nombre: `Confección Lentes con Receta #${receta.idReceta}`,
        tipo: 'Lunas Graduadas',
        cantidad: 1,
        precioUnit: precioBaseConfeccion,
        asociadoReceta: true,
      });
    }
    this.carrito.set(items);
    this.verificarAdelantoMinimo();
    this.avisos.abrir({
      titulo: 'Receta vinculada',
      mensaje: `Se asoció la receta médica #${receta.idReceta} a la venta y se agregaron los ítems al carrito.`,
    });
  }

  protected desvincularReceta(): void {
    this.recetaDetalle.set(null);
    this.carrito.update((items) => items.filter((i) => !i.asociadoReceta));
    if (this.modalidadPago() === 'ADELANTO') {
      this.modalidadPago.set('COMPLETO');
      this.montoAdelanto.set(null);
    }
  }

  private cargarCatalogoServicios(): void {
    this.ventaService.serviciosDisponibles().subscribe({
      next: (res) => this.serviciosCatalogo.set(res),
      error: () => this.serviciosCatalogo.set([]),
    });
  }

  private obtenerIdServicioConfeccion(): number {
    const lista = this.serviciosCatalogo();
    const confeccion = lista.find(
      (s) =>
        s.nombre.toUpperCase().includes('CONFECCION') ||
        s.nombre.toUpperCase().includes('MONTAJE') ||
        s.nombre.toUpperCase().includes('CRISTAL'),
    );
    return confeccion?.id ?? (lista.length > 0 ? lista[0].id : 1);
  }

  private cargarCatalogoMonturas(): void {
    this.buscandoItems.set(true);
    this.ventaService.monturasDisponibles(0, 15).subscribe({
      next: (res) => {
        this.monturasCatalogo.set(res.content);
        this.buscandoItems.set(false);
      },
      error: () => this.buscandoItems.set(false),
    });
  }

  protected agregarMonturaAlCarrito(m: Montura): void {
    // Si la montura ya está en el carrito asociada a la receta, bloquear duplicación
    const yaAsignadaReceta = this.carrito().some(
      (i) =>
        i.asociadoReceta &&
        ((m.idProducto && i.idProducto === m.idProducto) ||
          (m.codigo && i.nombre.includes(m.codigo)) ||
          (m.nombre && i.nombre.toLowerCase().includes(m.nombre.toLowerCase()))),
    );
    if (yaAsignadaReceta) {
      this.avisos.abrir({
        titulo: 'Montura ya asignada a la receta',
        mensaje: `La montura "${m.codigo} - ${m.nombre}" ya está asignada a la receta médica vinculada a esta venta.`,
      });
      return;
    }

    // Si ya existe en el carrito como producto libre, sumar cantidad
    const indexLibre = this.carrito().findIndex(
      (i) => !i.asociadoReceta && i.idProducto === m.idProducto,
    );
    if (indexLibre >= 0) {
      this.cambiarCantidad(indexLibre, 1);
      return;
    }

    this.carrito.update((items) => [
      ...items,
      {
        idProducto: m.idProducto,
        nombre: `${m.codigo} - ${m.nombre}`,
        tipo: 'Montura',
        cantidad: 1,
        precioUnit: m.precio,
      },
    ]);
    this.verificarAdelantoMinimo();
  }

  protected buscarCatalogo(termino: string): void {
    this.terminoBusqueda.set(termino);
    const q = termino.trim().toLowerCase();
    if (!q || q.length < 2) {
      this.resultadosBusqueda.set([]);
      return;
    }

    this.buscandoCatalogo.set(true);

    // 1. Filtrar servicios activos locales
    const serviciosCoincidentes = this.serviciosCatalogo()
      .filter((s) => s.nombre.toLowerCase().includes(q) || (s.descripcion && s.descripcion.toLowerCase().includes(q)))
      .map((s) => ({
        idServicio: s.id,
        nombre: s.nombre,
        tipo: 'Servicio',
        precio: s.precio,
      }));

    // 2. Buscar productos remotos en inventario
    this.ventaService.productosDisponibles(q, 0, 10).subscribe({
      next: (res) => {
        const productos = (res.content || []).map((p: any) => ({
          idProducto: p.idProducto ?? p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          tipo: p.categoriaNombre || 'Producto',
          precio: p.precio,
          stock: p.stockActual ?? p.stock,
        }));
        this.resultadosBusqueda.set([...serviciosCoincidentes, ...productos]);
        this.buscandoCatalogo.set(false);
      },
      error: () => {
        const monturasLocales = this.monturasCatalogo()
          .filter((m) => m.codigo.toLowerCase().includes(q) || m.nombre.toLowerCase().includes(q))
          .map((m) => ({
            idProducto: m.idProducto,
            codigo: m.codigo,
            nombre: m.nombre,
            tipo: 'Montura',
            precio: m.precio,
            stock: m.stock,
          }));
        this.resultadosBusqueda.set([...serviciosCoincidentes, ...monturasLocales]);
        this.buscandoCatalogo.set(false);
      },
    });
  }

  protected normalizarTipoItem(tipo: string): 'Montura' | 'Lunas Graduadas' | 'Accesorio' | 'Servicio' {
    const t = tipo.toLowerCase();
    if (t.includes('montura')) return 'Montura';
    if (t.includes('luna') || t.includes('cristal')) return 'Lunas Graduadas';
    if (t.includes('servicio') || t.includes('examen') || t.includes('refraccion')) return 'Servicio';
    return 'Accesorio';
  }

  protected agregarItemDesdeBuscador(item: {
    idProducto?: number;
    idServicio?: number;
    nombre: string;
    tipo: string;
    precio: number;
    codigo?: string;
  }): void {
    // Si el ítem ya está en el carrito asociado a la receta médica, bloquear duplicación
    const yaAsignadoReceta = this.carrito().some(
      (i) =>
        i.asociadoReceta &&
        ((item.idProducto && i.idProducto === item.idProducto) ||
          (item.idServicio && i.idServicio === item.idServicio) ||
          (item.codigo && i.nombre.includes(item.codigo))),
    );
    if (yaAsignadoReceta) {
      this.avisos.abrir({
        titulo: 'Ítem ya asignado a la receta médica',
        mensaje: `"${item.nombre}" ya forma parte de la receta médica vinculada a esta venta.`,
      });
      return;
    }

    // Si ya existe como producto libre en el carrito, sumar cantidad
    const indexLibre = this.carrito().findIndex(
      (i) =>
        !i.asociadoReceta &&
        ((item.idProducto && i.idProducto === item.idProducto) ||
          (item.idServicio && i.idServicio === item.idServicio && !item.idProducto)),
    );
    if (indexLibre >= 0) {
      this.cambiarCantidad(indexLibre, 1);
      this.terminoBusqueda.set('');
      this.resultadosBusqueda.set([]);
      return;
    }

    const nombreItem = item.codigo ? `${item.codigo} - ${item.nombre}` : item.nombre;
    this.carrito.update((items) => [
      ...items,
      {
        idProducto: item.idProducto,
        idServicio: item.idServicio,
        nombre: nombreItem,
        tipo: this.normalizarTipoItem(item.tipo),
        cantidad: 1,
        precioUnit: item.precio,
      },
    ]);
    this.terminoBusqueda.set('');
    this.resultadosBusqueda.set([]);
    this.verificarAdelantoMinimo();
  }

  protected limpiarBusquedaCatalogo(): void {
    this.terminoBusqueda.set('');
    this.resultadosBusqueda.set([]);
  }

  private verificarAdelantoMinimo(): void {
    if (this.modalidadPago() === 'ADELANTO') {
      const min = this.adelantoMinimo();
      if (!this.montoAdelanto() || this.montoAdelanto()! < min) {
        this.montoAdelanto.set(min);
      }
    }
  }

  protected cambiarCantidad(index: number, delta: number): void {
    const item = this.carrito()[index];
    if (item?.asociadoReceta) {
      this.avisos.abrir({
        titulo: 'Cantidad fija por receta médica',
        mensaje:
          'Los productos y servicios vinculados a una receta médica corresponden a una confección óptica personalizada única (1 unidad) y no pueden modificar su cantidad.',
      });
      return;
    }

    this.carrito.update((items) => {
      const actual = [...items];
      const nueva = actual[index].cantidad + delta;
      if (nueva <= 0) {
        actual.splice(index, 1);
      } else {
        actual[index] = { ...actual[index], cantidad: nueva };
      }
      return actual;
    });
    this.verificarAdelantoMinimo();
  }

  protected eliminarItem(index: number): void {
    const item = this.carrito()[index];
    if (item?.asociadoReceta) {
      this.avisos.abrir({
        titulo: 'Ítem vinculado a receta médica',
        mensaje:
          'Este ítem forma parte de la confección de la receta médica vinculada. Para retirarlo de la venta, use el botón "Desvincular Receta" en la sección superior de datos del paciente.',
      });
      return;
    }

    this.carrito.update((items) => items.filter((_, i) => i !== index));
    this.verificarAdelantoMinimo();
  }

  protected seleccionarModalidad(modalidad: 'COMPLETO' | 'ADELANTO'): void {
    if (modalidad === 'ADELANTO' && !this.recetaDetalle()) {
      this.avisos.abrir({
        titulo: 'Regla de Negocio (RN-VE06)',
        mensaje:
          'En ventas de productos o servicios directos sin receta médica, el pago debe registrarse por el 100% del total. Los adelantos solo aplican a ventas con confección de lentes bajo receta.',
      });
      return;
    }
    this.modalidadPago.set(modalidad);
    if (modalidad === 'ADELANTO') {
      if (!this.montoAdelanto()) {
        this.montoAdelanto.set(this.adelantoMinimo());
      }
      if (!this.fechaEntrega() || this.fechaEntrega() < this.fechaEntregaMinima()) {
        this.fechaEntrega.set(this.fechaEntregaMinima());
      }
    }
  }

  protected seleccionarMedioPago(metodo: MetodoPago): void {
    this.medioPago.set(metodo);
    if (metodo === 'QR_YAPE_PLIN') {
      this.modalQrAbierto.set(true);
    }
  }

  protected confirmarQr(operacion: string): void {
    this.numeroOperacion.set(operacion);
    this.modalQrAbierto.set(false);
  }

  protected registrarVenta(): void {
    if (this.carrito().length === 0) {
      this.error.set('Debe agregar al menos un producto o servicio al carrito.');
      return;
    }

    const totalVenta = this.total();
    const esAdelanto = this.modalidadPago() === 'ADELANTO';
    const adelanto = this.montoAdelanto() || 0;

    if (esAdelanto) {
      if (!this.recetaDetalle()) {
        this.error.set('No se permite registrar con adelanto una venta sin receta médica.');
        return;
      }
      if (adelanto < this.adelantoMinimo()) {
        this.error.set(
          `El monto de adelanto no puede ser menor al 25% del total (Mínimo: S/ ${this.adelantoMinimo().toFixed(2)}).`,
        );
        return;
      }
      if (!this.fechaEntrega()) {
        this.error.set('Debe ingresar la fecha prometida de entrega para ventas con adelanto.');
        return;
      }
      if (this.fechaEntrega() < this.fechaEntregaMinima()) {
        this.error.set(
          'La fecha prometida de entrega debe ser a partir de mañana (no se admiten fechas pasadas ni para el mismo día).',
        );
        return;
      }
    }

    const metodo = this.medioPago();
    if (requiereVoucher(metodo) && !this.numeroOperacion().trim()) {
      this.error.set(
        'El número de operación o voucher es obligatorio para pagos con tarjeta o transferencia bancaria (RN-VE12).',
      );
      return;
    }

    this.error.set(null);
    this.guardando.set(true);

    const montoCobrado = esAdelanto ? adelanto : totalVenta;

    const productosPayload: ProductoVendidoRequest[] = this.carrito()
      .filter((i) => i.idProducto)
      .map((i) => ({
        idProducto: i.idProducto!,
        cantidad: i.cantidad,
        precioUnit: i.precioUnit,
      }));

    const serviciosPayload: ServicioVendidoRequest[] = this.carrito()
      .filter((i) => i.idServicio)
      .map((i) => ({
        idServicio: i.idServicio!,
        precio: i.precioUnit,
      }));

    const pagosPayload: PagoRegistroRequest[] = [
      {
        monto: montoCobrado,
        metodoPago: metodo,
        numeroOperacion: this.numeroOperacion().trim() || null,
      },
    ];

    const request: VentaRegistroRequest = {
      idPaciente: this.pacienteSeleccionado()?.idPersona || null,
      idReceta: this.recetaDetalle()?.idReceta || null,
      tipoComprobante: this.tipoComprobante(),
      fechaEntregaEstimada: esAdelanto ? this.fechaEntrega() : null,
      productos: productosPayload.length > 0 ? productosPayload : undefined,
      servicios: serviciosPayload.length > 0 ? serviciosPayload : undefined,
      pagos: pagosPayload,
      total: totalVenta,
    };

    this.ventaService.registrar(request).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.ventaExitosa.set(res);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorHttp(err));
      },
    });
  }

  protected reiniciarFormulario(): void {
    this.ventaExitosa.set(null);
    this.carrito.set([]);
    this.pacienteSeleccionado.set(null);
    this.recetaDetalle.set(null);
    this.modoCliente.set('PUBLICO_GENERAL');
    this.modalidadPago.set('COMPLETO');
    this.montoAdelanto.set(null);
    this.fechaEntrega.set('');
    this.numeroOperacion.set('');
    this.medioPago.set('EFECTIVO');
    this.error.set(null);
  }
}
