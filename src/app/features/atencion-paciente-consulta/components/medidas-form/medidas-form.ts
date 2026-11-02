import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MedidasArray } from '../../models/examen-form';

@Component({
  selector: 'app-medidas-form',
  imports: [ReactiveFormsModule],
  templateUrl: './medidas-form.html',
  styleUrl: './medidas-form.css',
})
export class MedidasForm {
  readonly medidas = input.required<MedidasArray>();
  readonly bloqueado = input(false);
  readonly agregar = output<void>();
  readonly eliminar = output<number>();
  protected readonly ojos = [
    { clave: 'ojoDerecho', texto: 'OD · Derecho' },
    { clave: 'ojoIzquierdo', texto: 'OI · Izquierdo' },
  ] as const;
  protected readonly campos = [
    { clave: 'esfera', texto: 'Esfera' },
    { clave: 'cilindro', texto: 'Cilindro' },
    { clave: 'eje', texto: 'Eje (°)' },
    { clave: 'adicion', texto: 'Adición' },
  ] as const;
}
