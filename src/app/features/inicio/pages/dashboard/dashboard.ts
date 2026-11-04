import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AvisoService } from '../../../../shared/aviso-service';
import { Icono } from '../../../../shared/components/icono/icono';
import { VentaService } from '../../../ventas/services/venta.service';
import { PaginaVentaHistorial, VentaHistorialItem } from '../../../ventas/models/venta.model';

@Component({
  selector: 'app-dashboard',
  imports: [Icono, RouterLink, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  protected readonly avisos = inject(AvisoService);
  private readonly ventaService = inject(VentaService);

  protected readonly fecha = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(new Date());

  protected readonly ventasRecientes = signal<VentaHistorialItem[]>([]);
  protected readonly cargandoVentas = signal<boolean>(false);
  protected readonly totalVentasHoy = signal<number>(0);
  protected readonly conteoVentasHoy = signal<number>(0);

  protected readonly indicadores = computed(() => [
    {
      titulo: 'VENTAS DEL DÍA',
      valor: `S/ ${this.totalVentasHoy().toFixed(2)}`,
      detalle:
        this.conteoVentasHoy() > 0
          ? `${this.conteoVentasHoy()} ${this.conteoVentasHoy() === 1 ? 'venta registrada' : 'ventas registradas'}`
          : 'Meta diaria estimada: sin configurar',
      icono: 'money',
      tono: 'teal',
    },
    {
      titulo: 'ÓRDENES DE LENTES',
      valor: '0 órdenes',
      detalle: '0 en entrega • 0 en taller de biselado',
      icono: 'bag',
      tono: 'blue',
    },
    {
      titulo: 'PACIENTES DEL DÍA',
      valor: '0 atendidos',
      detalle: '0 primeras veces • 0 controles',
      icono: 'users',
      tono: 'purple',
    },
    {
      titulo: 'ALERTA DE STOCK',
      valor: '0 productos',
      detalle: 'Sin datos de inventario',
      icono: 'warning',
      tono: 'amber',
    },
  ]);

  ngOnInit(): void {
    this.cargarVentasRecientes();
  }

  cargarVentasRecientes(): void {
    this.cargandoVentas.set(true);
    this.ventaService
      .historial({ page: 0, size: 5 })
      .pipe(
        catchError(() =>
          of<PaginaVentaHistorial>({
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 5,
            number: 0,
            first: true,
            last: true,
            empty: true,
          }),
        ),
        finalize(() => this.cargandoVentas.set(false)),
      )
      .subscribe((pagina: PaginaVentaHistorial) => {
        const ventas = pagina.content ?? [];
        this.ventasRecientes.set(ventas);

        // Sumar ventas correspondientes a la fecha de hoy
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        const hoyPrefijo = `${año}-${mes}-${dia}`;

        const ventasHoy = ventas.filter(
          (v: VentaHistorialItem) => v.fechaRegistro && v.fechaRegistro.startsWith(hoyPrefijo),
        );
        const total = ventasHoy.reduce(
          (acc: number, v: VentaHistorialItem) => acc + (Number(v.total) || 0),
          0,
        );

        this.totalVentasHoy.set(total);
        this.conteoVentasHoy.set(ventasHoy.length);
      });
  }
}
