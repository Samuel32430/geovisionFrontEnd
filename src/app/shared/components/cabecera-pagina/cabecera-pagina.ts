import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icono } from '../icono/icono';

export interface EnlaceCabecera {
  texto: string;
  ruta?: string;
}

/** Navegación del módulo basada en la cabecera del perfil del paciente. */
@Component({
  selector: 'app-cabecera-pagina',
  imports: [RouterLink, Icono],
  template: `
    <nav aria-label="Ruta de navegación">
      @for (enlace of enlaces(); track $index; let ultimo = $last) {
        @if (enlace.ruta) {
          <a [routerLink]="enlace.ruta">
            @if ($first) {
              <app-icono nombre="users" />
            }
            {{ enlace.texto }}</a
          >
        } @else {
          <strong>{{ enlace.texto }}</strong>
        }
        @if (!ultimo) {
          <span aria-hidden="true">/</span>
        }
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 14px;
    }
    nav {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: #8d9eb6;
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      text-decoration: none;
      color: #657c99;
    }
    app-icono {
      width: 14px;
      height: 14px;
    }
    strong {
      color: #26374f;
      font-weight: 500;
    }
    a:hover {
      color: #00877f;
    }
    a:focus-visible {
      outline: 3px solid #00b9a7;
      outline-offset: 3px;
    }
    @media (max-width: 600px) {
      nav {
        padding-left: 48px;
        font-size: 11px;
      }
    }
  `,
})
export class CabeceraPagina {
  readonly enlaces = input.required<EnlaceCabecera[]>();
}
