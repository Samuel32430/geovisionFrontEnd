import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AvisoService } from '../../shared/aviso-service';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icono } from '../../shared/components/icono/icono';
import { AuthService } from '../../core/auth/auth-service';
import { SesionService } from '../../core/auth/sesion-service';
import { Router } from '@angular/router';
import { SeguridadAccess } from '../../features/seguridad/seguridad-access';
import { OrdenAcceso } from '../../features/ordenes-trabajo/orden-acceso';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icono],
  selector: 'app-main-layout',
  styleUrl: './main-layout.css',
  templateUrl: './main-layout.html',
})
export class MainLayout {
  protected readonly avisos = inject(AvisoService);
  protected readonly sesion = inject(SesionService);
  protected readonly accesoSeguridad = inject(SeguridadAccess);
  protected readonly accesoOrden = inject(OrdenAcceso);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly cerrando = signal(false);
  protected readonly menuAbierto = signal(false);
  protected readonly pendientes = [
    { etiqueta: 'Control de inventario', icono: 'box' },
  ];
  protected readonly seguridad = [{ etiqueta: 'Configuración', icono: 'settings' }];

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
