import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  finalize,
  map,
  Observable,
  of,
  switchMap,
  timer,
} from 'rxjs';
import { SesionService } from '../../../../core/auth/sesion-service';
import { AvisoService } from '../../../../shared/aviso-service';
import { Icono } from '../../../../shared/components/icono/icono';
import type { Paciente } from '../../../atencion-paciente-consulta/models/paciente.model';
import { PacienteService } from '../../../atencion-paciente-consulta/services/paciente';
import type { ProductoItem } from '../../../inventario/models/inventario.model';
import { InventarioService } from '../../../inventario/services/inventario.service';
import { VentaDetalleModal } from '../../../ventas/components/venta-detalle-modal/venta-detalle-modal';
import type { PaginaVentaHistorial, VentaResponse } from '../../../ventas/models/venta.model';
import { VentaService } from '../../../ventas/services/venta.service';
import type {
  AtencionesDelDia,
  OrdenesActivas,
  VentasDelDia,
} from '../../models/resumen-inicio.model';
import { ResumenInicioService } from '../../services/resumen-inicio.service';

type Consulta<T> =
  | { estado: 'sin-acceso' | 'cargando' | 'error'; datos?: undefined }
  | { estado: 'lista'; datos: T };

const ESTADO_CONSULTA = {
  'sin-acceso': 'Sin permiso de consulta',
  cargando: 'Cargando…',
  error: 'No se pudo consultar',
  lista: '',
};

const LIMITE_SUGERENCIAS = 3;
const ESPERA_BUSQUEDA_MS = 250;

@Component({
  selector: 'app-dashboard',
  imports: [Icono, RouterLink, ReactiveFormsModule, DecimalPipe, DatePipe, VentaDetalleModal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  protected readonly avisos = inject(AvisoService);
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ventaService = inject(VentaService);
  private readonly inventario = inject(InventarioService);
  private readonly pacientes = inject(PacienteService);
  private readonly resumen = inject(ResumenInicioService);

  protected readonly fecha = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(new Date());

  protected readonly puedeVerVentas = computed(() => this.sesion.tienePermiso('VENTAS_LEER'));
  protected readonly puedeVerInventario = computed(() =>
    this.sesion.tienePermiso(['INVENTARIO_LEER', 'PRODUCTOS_LEER']),
  );
  protected readonly puedeVerPacientes = computed(() => this.sesion.tienePermiso('PACIENTES_LEER'));
  protected readonly busqueda = new FormControl('', { nonNullable: true });
  protected readonly busquedaAbierta = signal(false);
  protected readonly sugerencias = signal<Consulta<Paciente[]> | null>(null);

  protected readonly ventas = signal<Consulta<VentasDelDia>>({ estado: 'sin-acceso' });
  protected readonly ordenes = signal<Consulta<OrdenesActivas>>({ estado: 'sin-acceso' });
  protected readonly atenciones = signal<Consulta<AtencionesDelDia>>({ estado: 'sin-acceso' });
  protected readonly stock = signal<Consulta<ProductoItem[]>>({ estado: 'sin-acceso' });
  protected readonly alertasRecientes = computed(() =>
    [...(this.stock().datos ?? [])]
      .sort((a, b) => a.stock - b.stock || a.nombre.localeCompare(b.nombre, 'es'))
      .slice(0, 5),
  );
  protected readonly historial = signal<Consulta<PaginaVentaHistorial>>({ estado: 'sin-acceso' });
  protected readonly cargandoVentas = computed(() => this.historial().estado === 'cargando');
  protected readonly ventasRecientes = computed(() => this.historial().datos?.content ?? []);
  protected readonly paginaVentas = computed(() => this.historial().datos?.number ?? 0);
  protected readonly ventaSeleccionada = signal<VentaResponse | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly estadoConsulta = ESTADO_CONSULTA;

  protected readonly indicadores = computed(() => {
    const ventas = this.ventas();
    const ordenes = this.ordenes();
    const atenciones = this.atenciones();
    const stock = this.stock();
    return [
      {
        titulo: 'VENTAS DEL DÍA',
        valor: ventas.datos ? `S/ ${ventas.datos.total.toFixed(2)}` : '—',
        detalle: ventas.datos
          ? `${ventas.datos.cantidad} ${ventas.datos.cantidad === 1 ? 'venta registrada' : 'ventas registradas'}`
          : ESTADO_CONSULTA[ventas.estado],
        icono: 'money',
        tono: 'teal',
      },
      {
        titulo: 'ÓRDENES DE LENTES',
        valor: ordenes.datos
          ? `${ordenes.datos.enProceso + ordenes.datos.listasParaEntrega} órdenes`
          : '—',
        detalle: ordenes.datos
          ? `${ordenes.datos.listasParaEntrega} listas para entrega · ${ordenes.datos.enProceso} en proceso`
          : ESTADO_CONSULTA[ordenes.estado],
        icono: 'bag',
        tono: 'blue',
      },
      {
        titulo: 'PACIENTES DEL DÍA',
        valor: atenciones.datos ? `${atenciones.datos.pacientes} atendidos` : '—',
        detalle: atenciones.datos
          ? `${atenciones.datos.primerasVeces} primeras veces · ${atenciones.datos.pacientes - atenciones.datos.primerasVeces} recurrentes`
          : ESTADO_CONSULTA[atenciones.estado],
        icono: 'users',
        tono: 'purple',
      },
      {
        titulo: 'ALERTA DE STOCK',
        valor: stock.datos
          ? `${stock.datos.length} ${stock.datos.length === 1 ? 'producto' : 'productos'}`
          : '—',
        detalle: stock.datos
          ? 'Productos activos con stock de 5 unidades o menos'
          : ESTADO_CONSULTA[stock.estado],
        icono: 'warning',
        tono: stock.datos?.length ? 'amber' : 'teal',
      },
    ];
  });

  protected buscarPaciente(): void {
    const termino = this.busqueda.value.trim();
    if (!termino || !this.puedeVerPacientes()) return;
    this.busquedaAbierta.set(false);
    void this.router.navigate(['/atencion-paciente-consulta/pacientes'], {
      queryParams: { buscar: termino },
    });
  }

  protected cerrarBusqueda(evento: FocusEvent): void {
    const formulario = evento.currentTarget as HTMLElement;
    const destino = evento.relatedTarget;
    if (!(destino instanceof Node) || !formulario.contains(destino)) {
      this.busquedaAbierta.set(false);
    }
  }

  ngOnInit(): void {
    if (this.puedeVerVentas()) {
      this.consultar(this.ventas, this.resumen.ventas());
      this.cargarVentasRecientes();
    }
    if (this.sesion.tienePermiso('ORDENES_TRABAJO_LEER')) {
      this.consultar(this.ordenes, this.resumen.ordenes());
    }
    if (this.puedeVerPacientes()) {
      this.consultar(this.atenciones, this.resumen.atenciones());
      this.buscarSugerencias();
    }
    if (this.puedeVerInventario()) {
      this.consultar(this.stock, this.inventario.listarAlertasBajoStock());
    }
  }

  private buscarSugerencias(): void {
    this.busqueda.valueChanges
      .pipe(
        map((valor) => valor.trim()),
        distinctUntilChanged(),
        switchMap((termino) => {
          if (termino.length < 2) {
            this.sugerencias.set(null);
            return EMPTY;
          }
          this.sugerencias.set({ estado: 'cargando' });
          return timer(ESPERA_BUSQUEDA_MS).pipe(
            switchMap(() =>
              this.pacientes.listar({ termino, estado: 1, page: 0, size: LIMITE_SUGERENCIAS }),
            ),
            map((pagina): Consulta<Paciente[]> => ({
              estado: 'lista',
              datos: pagina.content.slice(0, LIMITE_SUGERENCIAS),
            })),
            catchError(() => of<Consulta<Paciente[]>>({ estado: 'error' })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => this.sugerencias.set(resultado));
  }

  protected cargarVentasRecientes(pagina = 0): void {
    this.consultar(this.historial, this.ventaService.historial({ page: pagina, size: 5 }));
  }

  protected verVenta(id: number): void {
    if (this.cargandoDetalle()) return;
    this.cargandoDetalle.set(true);
    this.ventaService
      .detalleHistorial(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoDetalle.set(false)),
      )
      .subscribe({
        next: (venta) => this.ventaSeleccionada.set(venta),
        error: () =>
          this.avisos.abrir({
            titulo: 'Detalle de venta',
            mensaje: 'No se pudo consultar esta venta.',
            tipo: 'error',
          }),
      });
  }

  private consultar<T>(destino: WritableSignal<Consulta<T>>, peticion: Observable<T>): void {
    destino.set({ estado: 'cargando' });
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (datos) => destino.set({ estado: 'lista', datos }),
      error: () => destino.set({ estado: 'error' }),
    });
  }
}
