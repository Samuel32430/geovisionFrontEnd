import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, map, Observable, Subscription } from 'rxjs';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { AvisoService } from '../../shared/aviso-service';
import { OrdenAcceso } from './orden-acceso';
import { ESTADOS, EstadoOrden, OrdenApi, OrdenTrabajo, PendienteOrden } from './orden-api';

@Component({
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './orden-lista.html',
  styleUrl: './ordenes.css',
})
export class OrdenLista {
  private readonly api = inject(OrdenApi);
  private readonly router = inject(Router);
  private readonly avisos = inject(AvisoService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly acceso = inject(OrdenAcceso);
  protected readonly estados = ESTADOS;
  protected readonly opciones = Object.keys(ESTADOS) as EstadoOrden[];
  protected readonly pendientes = signal<PendienteOrden[]>([]);
  protected readonly ordenes = signal<OrdenTrabajo[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected pestana: 'pendientes' | 'ordenes' = 'pendientes';
  protected estado: EstadoOrden | '' = '';
  protected busqueda = '';
  protected termino = '';
  protected page = 0;
  protected size = 10;
  protected total = 0;
  protected paginas = 0;
  private consulta?: Subscription;

  constructor() {
    this.cargar();
  }

  protected cambiar(pestana: 'pendientes' | 'ordenes'): void {
    this.pestana = pestana;
    this.cargar(0);
  }

  protected buscar(): void {
    this.termino = this.busqueda.trim();
    this.cargar(0);
  }

  protected cargar(page = this.page): void {
    this.consulta?.unsubscribe();
    this.page = page;
    this.error.set('');
    this.cargando.set(true);
    const pendientes = this.pestana === 'pendientes';
    const consulta: Observable<{
      pagina: { totalElements: number; totalPages: number };
      pendientes: PendienteOrden[];
      ordenes: OrdenTrabajo[];
    }> = pendientes
      ? this.api
          .pendientes(page, this.size, this.termino)
          .pipe(map((pagina) => ({ pagina, pendientes: pagina.content, ordenes: [] })))
      : this.api
          .listar(page, this.size, this.termino, this.estado)
          .pipe(map((pagina) => ({ pagina, pendientes: [], ordenes: pagina.content })));
    this.consulta = consulta.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resultado) => {
        this.total = resultado.pagina.totalElements;
        this.paginas = resultado.pagina.totalPages;
        if (page > 0 && page >= this.paginas) {
          this.cargar(Math.max(0, this.paginas - 1));
          return;
        }
        this.pendientes.set(resultado.pendientes);
        this.ordenes.set(resultado.ordenes);
        this.cargando.set(false);
      },
      error: (error) => {
        this.error.set(mensajeErrorHttp(error));
        this.cargando.set(false);
      },
    });
  }

  protected async generar(pendiente: PendienteOrden): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true);
    try {
      const confirmado = await this.avisos.confirmar({
        titulo: 'Generar orden de trabajo',
        mensaje: `Se generará la orden del lente #${pendiente.idLente} de ${pendiente.nombrePaciente}.`,
        textoConfirmar: 'Generar orden',
      });
      if (!confirmado || this.destroyRef.destroyed) return;
      const orden = await firstValueFrom(
        this.api.generar(pendiente.idLente, '').pipe(takeUntilDestroyed(this.destroyRef)),
      );
      await this.router.navigate(['/ordenes-trabajo', orden.id]);
    } catch (error) {
      if (this.destroyRef.destroyed) return;
      this.avisos.abrir({
        titulo: 'No se pudo generar la orden',
        mensaje: mensajeErrorHttp(error),
        tipo: 'error',
      });
      this.cargar();
    } finally {
      this.guardando.set(false);
    }
  }
}
