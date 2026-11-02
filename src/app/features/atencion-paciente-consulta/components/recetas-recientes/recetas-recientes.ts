import { Component, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { RecetaResumen } from '../../models/receta.model';
import { AvisoService } from '../../../../shared/aviso-service';
import { Icono } from '../../../../shared/components/icono/icono';

@Component({
  selector: 'app-recetas-recientes',
  imports: [DatePipe, Icono],
  templateUrl: './recetas-recientes.html',
  styleUrl: './recetas-recientes.css',
})
export class RecetasRecientes {
  readonly resultado = input<PaginaResponse<RecetaResumen> | null>(null);
  readonly cargando = input(false);
  readonly error = input<string | null>(null);
  readonly verHistorial = output<void>();
  readonly verDetalle = output<number>();
  readonly recargar = output<void>();
  protected readonly avisos = inject(AvisoService);
}
