import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icono } from '../../../../shared/components/icono/icono';

@Component({
  selector: 'app-reporte-ventas',
  standalone: true,
  imports: [CommonModule, Icono],
  templateUrl: './reporte-ventas.html',
  styleUrl: './reporte-ventas.css',
})
export class ReporteVentas {}
