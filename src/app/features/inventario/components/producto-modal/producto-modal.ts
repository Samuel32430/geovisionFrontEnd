import { Component, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icono } from '../../../../shared/components/icono/icono';
import { ProductoItem, ProductoRequest } from '../../models/inventario.model';

@Component({
  selector: 'app-producto-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, Icono],
  templateUrl: './producto-modal.html',
  styleUrl: './producto-modal.css',
})
export class ProductoModal implements OnInit {
  readonly productoEditar = input<ProductoItem | null>(null);
  readonly cerrar = output<void>();
  readonly guardar = output<ProductoRequest>();

  protected readonly codigo = signal('');
  protected readonly nombre = signal('');
  protected readonly marca = signal('');
  protected readonly descripcion = signal('');
  protected readonly precio = signal<number>(0);
  protected readonly stockInicial = signal<number>(0);
  protected readonly idCategoria = signal<number>(1);
  protected readonly esMontura = signal(false);

  // Campos de montura
  protected readonly tipoMontura = signal('COMPLETA');
  protected readonly material = signal('ACETATO');
  protected readonly color = signal('NEGRO');
  protected readonly calibre = signal<number | undefined>(undefined);
  protected readonly puente = signal<number | undefined>(undefined);
  protected readonly varilla = signal<number | undefined>(undefined);
  protected readonly forma = signal('RECTANGULAR');
  protected readonly genero = signal('UNISEX');

  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const p = this.productoEditar();
    if (p) {
      this.codigo.set(p.codigo || '');
      this.nombre.set(p.nombre || '');
      this.marca.set(p.marca || '');
      this.descripcion.set(p.descripcion || '');
      this.precio.set(p.precio || 0);
      this.idCategoria.set(p.idCategoria || 1);
      this.esMontura.set(!!p.esMontura || !!p.montura);

      if (p.montura) {
        this.tipoMontura.set(p.montura.tipoMontura || 'COMPLETA');
        this.material.set(p.montura.material || 'ACETATO');
        this.color.set(p.montura.color || 'NEGRO');
        this.calibre.set(p.montura.calibre);
        this.puente.set(p.montura.puente);
        this.varilla.set(p.montura.varilla);
        this.forma.set(p.montura.forma || 'RECTANGULAR');
        this.genero.set(p.montura.genero || 'UNISEX');
      }
    }
  }

  protected onCategoriaChange(id: number): void {
    this.idCategoria.set(id);
    this.esMontura.set(id === 1);
  }

  protected onSubmit(): void {
    if (!this.codigo().trim()) {
      this.error.set('El código del producto es obligatorio.');
      return;
    }
    if (!this.nombre().trim()) {
      this.error.set('El nombre del producto es obligatorio.');
      return;
    }
    if (!this.marca().trim()) {
      this.error.set('La marca es obligatoria.');
      return;
    }
    if (!this.precio() || this.precio() <= 0) {
      this.error.set('El precio debe ser mayor a 0.');
      return;
    }

    const req: ProductoRequest = {
      codigo: this.codigo().trim().toUpperCase(),
      nombre: this.nombre().trim(),
      marca: this.marca().trim(),
      descripcion: this.descripcion().trim() || undefined,
      precio: this.precio(),
      idCategoria: this.idCategoria(),
    };

    if (!this.productoEditar()) {
      req.stockInicial = Math.max(0, this.stockInicial());
    }

    if (this.esMontura()) {
      req.montura = {
        tipoMontura: this.tipoMontura(),
        material: this.material(),
        color: this.color(),
        calibre: this.calibre(),
        puente: this.puente(),
        varilla: this.varilla(),
        forma: this.forma(),
        genero: this.genero(),
      };
    }

    this.guardar.emit(req);
  }
}
