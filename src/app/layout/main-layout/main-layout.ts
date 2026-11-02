import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AvisoService } from '../../shared/aviso-service';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icono } from '../../shared/components/icono/icono';
import { AuthService } from '../../core/auth/auth-service';
import { SesionService } from '../../core/auth/sesion-service';
import { Router } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icono],
  selector: 'app-main-layout',
  styleUrl: './main-layout.css',
  templateUrl: './main-layout.html',
})
export class MainLayout {
  protected readonly avisos = inject(AvisoService);
  protected readonly sesion = inject(SesionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly cerrando = signal(false);
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

  protected async cerrarSesion(): Promise<void> {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    const confirmado = await this.avisos.confirmar({
      titulo: '¿Cerrar sesión?',
      mensaje: 'Volverás al inicio de sesión. Los cambios que no hayas guardado se descartarán.',
      textoConfirmar: 'Cerrar sesión',
    });
    if (this.destroyRef.destroyed) return;
    if (!confirmado) {
      this.cerrando.set(false);
      return;
    }
    this.auth.logout().subscribe(() => {
      this.cerrando.set(false);
      if (this.destroyRef.destroyed) return;
      void this.router.navigate(['/login']);
    });
  }
}
