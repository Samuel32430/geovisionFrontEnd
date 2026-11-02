import { Injectable, signal, TemplateRef } from '@angular/core';

export interface AccionAviso {
  etiqueta: string;
  estilo?: 'principal' | 'secundario' | 'peligro';
  ejecutar: () => void;
}

export interface Aviso {
  titulo: string;
  mensaje: string;
  tipo?: 'informacion' | 'error' | 'confirmacion' | 'exito';
  advertencia?: { titulo: string; mensaje: string };
  contenido?: TemplateRef<unknown>;
  acciones?: readonly AccionAviso[];
  textoCerrar?: string;
}

export interface Confirmacion extends Omit<Aviso, 'tipo' | 'acciones'> {
  textoConfirmar?: string;
  peligrosa?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AvisoService {
  private readonly estado = signal<Aviso | null>(null);
  readonly actual = this.estado.asReadonly();
  private resolverConfirmacion?: (confirmada: boolean) => void;

  abrir(aviso: Aviso): void {
    this.cerrar();
    this.estado.set(aviso);
  }

  confirmar(opciones: Confirmacion): Promise<boolean> {
    this.cerrar();
    return new Promise((resolve) => {
      this.resolverConfirmacion = resolve;
      this.estado.set({
        ...opciones,
        tipo: 'confirmacion',
        textoCerrar: opciones.textoCerrar ?? 'Cancelar',
        acciones: [
          {
            etiqueta: opciones.textoConfirmar ?? 'Confirmar',
            estilo: opciones.peligrosa ? 'peligro' : 'principal',
            ejecutar: () => resolve(true),
          },
        ],
      });
    });
  }

  ejecutar(accion: AccionAviso): void {
    // Close before handing control back to the owning feature.
    this.estado.set(null);
    this.resolverConfirmacion = undefined;
    accion.ejecutar();
  }

  pendiente(funcion: string): void {
    this.abrir({
      titulo: `${funcion} no disponible`,
      mensaje:
        'Esta función todavía no está implementada. Podrás utilizarla cuando el módulo esté disponible.',
      tipo: 'informacion',
    });
  }

  cerrar(): void {
    this.estado.set(null);
    this.resolverConfirmacion?.(false);
    this.resolverConfirmacion = undefined;
  }
}
