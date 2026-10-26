import { Component } from '@angular/core';
import { Icono } from '../../../../shared/components/icono/icono';

@Component({
  selector: 'app-dashboard',
  imports: [Icono],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  protected readonly fecha = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(new Date());
  protected readonly indicadores = [
    {
      titulo: 'VENTAS DEL DÍA',
      valor: 'S/ 0.00',
      detalle: 'Meta diaria estimada: sin configurar',
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
  ];
}
