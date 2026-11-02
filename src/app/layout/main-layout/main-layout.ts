import { Component, inject, signal } from '@angular/core';
import { AvisoService } from '../../shared/aviso-service';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icono } from '../../shared/components/icono/icono';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icono],
  selector: 'app-main-layout',
  styleUrl: './main-layout.css',
  templateUrl: './main-layout.html',
})
export class MainLayout {
  protected readonly avisos = inject(AvisoService);
  protected readonly menuAbierto = signal(false);
  protected readonly pendientes = [
    { etiqueta: 'Venta de productos y servicios', icono: 'cart' },
    { etiqueta: 'Elaboración de orden de trabajo', icono: 'lab' },
    { etiqueta: 'Control de inventario', icono: 'box' },
  ];
  protected readonly seguridad = [
    { etiqueta: 'Configuración', icono: 'settings' },
    { etiqueta: 'Gestión de Usuarios', icono: 'users' },
    { etiqueta: 'Roles y Permisos', icono: 'shield' },
  ];
}
