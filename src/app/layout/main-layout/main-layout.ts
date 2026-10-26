import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icono } from '../../shared/components/icono/icono';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icono],
  selector: 'app-main-layout',
  styleUrl: './main-layout.css',
  templateUrl: './main-layout.html',
})
export class MainLayout {
  protected readonly menuAbierto = signal(false);
  protected readonly pendientes = [
    { etiqueta: 'Ventas & Caja', icono: 'cart' },
    { etiqueta: 'Laboratorio & Taller', icono: 'lab' },
    { etiqueta: 'Inventario & Monturas', icono: 'box' },
  ];
  protected readonly seguridad = [
    { etiqueta: 'Configuración', icono: 'settings' },
    { etiqueta: 'Gestión de Usuarios', icono: 'users' },
    { etiqueta: 'Roles y Permisos', icono: 'shield' },
  ];
}
