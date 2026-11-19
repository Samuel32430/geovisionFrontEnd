import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { VentaResponse } from '../../models/venta.model';
import { Icono } from '../../../../shared/components/icono/icono';
import { ConfiguracionApi } from '../../../configuracion/services/configuracion-api';
import { ConfiguracionEmpresa } from '../../../configuracion/models/configuracion.model';

@Component({
  selector: 'app-venta-exitosa-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, Icono],
  templateUrl: './venta-exitosa-modal.html',
  styleUrl: './venta-exitosa-modal.css',
})
export class VentaExitosaModal implements OnInit {
  private readonly configApi = inject(ConfiguracionApi);

  readonly venta = input.required<VentaResponse>();
  readonly cerrar = output<void>();
  readonly nuevaVenta = output<void>();

  protected readonly empresaFallback = signal<ConfiguracionEmpresa | null>(null);

  ngOnInit(): void {
    if (!this.venta().datosEmpresa) {
      this.configApi.obtener().subscribe({
        next: (emp) => this.empresaFallback.set(emp),
        error: () => {},
      });
    }
  }

  get nombreEmpresa(): string {
    return (
      this.venta().datosEmpresa?.nombreComercial ||
      this.empresaFallback()?.nombreComercial ||
      this.empresaFallback()?.nombreLegal ||
      'GeoVision Óptica & Laboratorio'
    );
  }

  get rucEmpresa(): string {
    return (
      this.venta().datosEmpresa?.ruc ||
      this.empresaFallback()?.ruc ||
      '20608945123'
    );
  }

  get direccionEmpresa(): string {
    return (
      this.venta().datosEmpresa?.direccion ||
      this.empresaFallback()?.direccion ||
      'Av. Javier Prado Este 2450, San Borja, Lima'
    );
  }

  protected imprimir(): void {
    window.print();
  }
}
