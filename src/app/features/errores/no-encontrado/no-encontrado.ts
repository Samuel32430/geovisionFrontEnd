import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SesionService } from '../../../core/auth/sesion-service';
import { Icono } from '../../../shared/components/icono/icono';
import { administraSeguridad } from '../../seguridad/seguridad-access';

@Component({
  selector: 'app-no-encontrado',
  imports: [RouterLink, Icono],
  templateUrl: './no-encontrado.html',
  styleUrl: './no-encontrado.css',
})
export class NoEncontrado {
  private readonly sesion = inject(SesionService);
  protected readonly pacientes = computed(
    () => this.sesion.actual()?.permisos.includes('PACIENTES_LEER') ?? false,
  );
  protected readonly seguridad = computed(() => administraSeguridad(this.sesion.actual()));
}
