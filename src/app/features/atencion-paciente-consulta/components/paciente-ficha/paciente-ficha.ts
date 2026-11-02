import { Component, computed, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Paciente } from '../../models/paciente.model';
import { RecetaResumen } from '../../models/receta.model';
import { Icono } from '../../../../shared/components/icono/icono';
import { AvisoService } from '../../../../shared/aviso-service';

@Component({
  selector: 'app-paciente-ficha',
  imports: [DatePipe, Icono],
  templateUrl: './paciente-ficha.html',
  styleUrl: './paciente-ficha.css',
})
export class PacienteFicha {
  readonly verHistorial = output<void>();
  readonly paciente = input.required<Paciente>();
  readonly ultimaReceta = input<RecetaResumen | null>(null);
  readonly cargandoRecetas = input(false);
  readonly errorRecetas = input<string | null>(null);
  protected readonly avisos = inject(AvisoService);
  protected readonly nombre = computed(() => {
    const persona = this.paciente().persona;
    return persona.nombreCompleto || `${persona.nombres} ${persona.apellidos}`.trim();
  });
  protected readonly iniciales = computed(() => {
    const persona = this.paciente().persona;
    return `${persona.nombres.charAt(0)}${persona.apellidos.charAt(0)}`.toLocaleUpperCase('es');
  });
  protected readonly edad = computed(() => {
    const fecha = this.paciente().persona.fechaNacimiento;
    if (!fecha) return null;
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const actual = new Date();
    const edad =
      actual.getFullYear() -
      anio -
      (actual.getMonth() + 1 < mes || (actual.getMonth() + 1 === mes && actual.getDate() < dia)
        ? 1
        : 0);
    return Number.isFinite(edad) && edad >= 0 ? edad : null;
  });
}
