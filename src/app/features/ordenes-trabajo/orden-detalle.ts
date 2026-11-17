import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { mensajeErrorHttp } from '../../core/utils/http-error';
import { AvisoService } from '../../shared/aviso-service';
import { OrdenAcceso } from './orden-acceso';
import {
  ESTADOS,
  Lensometria,
  MedidaOrden,
  OrdenApi,
  OrdenTrabajo,
  PoliticaCalidad,
} from './orden-api';

type Accion = 'envio' | 'recepcion' | 'calidad' | 'entrega';
type Magnitud = 'esfera' | 'cilindro' | 'eje' | 'adicion';
const OJOS = [
  { clave: 'ojoDerecho', etiqueta: 'OD · Derecho' },
  { clave: 'ojoIzquierdo', etiqueta: 'OI · Izquierdo' },
] as const;
type Ojo = (typeof OJOS)[number]['clave'];
type Captura = Record<Ojo, Record<Magnitud, string>> & { distanciaPupilar: string; prisma: string };

@Component({
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink],
  templateUrl: './orden-detalle.html',
  styleUrl: './ordenes.css',
})
export class OrdenDetalle {
  private readonly api = inject(OrdenApi);
  private readonly avisos = inject(AvisoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  protected readonly acceso = inject(OrdenAcceso);
  protected readonly estados = ESTADOS;
  protected readonly ojos = OJOS;
  protected readonly magnitudes: Magnitud[] = ['esfera', 'cilindro', 'eje', 'adicion'];
  protected readonly patrones: Record<Magnitud, string> = {
    esfera: '-?[0-9]{1,3}([.][0-9]{1,2})?',
    cilindro: '-?[0-9]{1,3}([.][0-9]{1,2})?',
    eje: '([0-9]{1,2}|1[0-7][0-9]|180)',
    adicion: '-?[0-9]{1,2}([.][0-9]{1,2})?',
  };
  protected readonly orden = signal<OrdenTrabajo | null>(null);
  protected readonly cargando = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly error = signal('');
  protected readonly errorAccion = signal('');
  protected readonly resultado = signal<{ texto: string; tipo: 'exito' | 'advertencia' } | null>(
    null,
  );
  protected readonly enlace = signal('');
  protected readonly abierto = signal(false);
  protected readonly ultimo = computed(
    () =>
      this.orden()?.envios.reduce<OrdenTrabajo['envios'][number] | null>(
        (actual, envio) =>
          !actual ||
          envio.fechaEnvio > actual.fechaEnvio ||
          (envio.fechaEnvio === actual.fechaEnvio && envio.id > actual.id)
            ? envio
            : actual,
        null,
      ) ?? null,
  );
  protected readonly telefono = computed(
    () => this.orden()?.telefonoPaciente?.replace(/[\s().-]/g, '') ?? '',
  );
  protected readonly telefonoValido = computed(() => /^\+[1-9][0-9]{7,14}$/.test(this.telefono()));
  protected accion: Accion | null = null;
  protected laboratorios: { id: number; nombre: string }[] = [];
  protected politica: PoliticaCalidad | null = null;
  protected captura: Captura[] = [];
  protected observaciones = '';
  protected idLaboratorio: number | null = null;
  protected fecha = '';

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    if (!Number.isSafeInteger(this.id) || this.id <= 0) {
      this.error.set('La referencia de la orden no es válida.');
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    try {
      this.orden.set(await this.leer(this.api.obtener(this.id)));
    } catch (error) {
      if (!this.destroyRef.destroyed) this.error.set(mensajeErrorHttp(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async abrir(accion: Accion): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.errorAccion.set('');
    this.resultado.set(null);
    this.accion = accion;
    this.observaciones = '';
    this.idLaboratorio = null;
    this.fecha = '';
    this.politica = null;
    this.laboratorios = [];
    try {
      if (accion === 'envio') this.laboratorios = await this.leer(this.api.laboratorios());
      if (accion === 'calidad') {
        const ojo = () => ({ esfera: '', cilindro: '', eje: '', adicion: '' });
        this.captura = (this.orden()?.lente.medidas ?? []).map(() => ({
          distanciaPupilar: '',
          prisma: '',
          ojoDerecho: ojo(),
          ojoIzquierdo: ojo(),
        }));
        this.politica = await this.leer(this.api.politica());
      }
    } catch (error) {
      if (!this.destroyRef.destroyed) this.errorAccion.set(mensajeErrorHttp(error));
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async guardar(): Promise<void> {
    const orden = this.orden();
    const envio = this.ultimo();
    if (!orden || this.ocupado()) return;
    const observaciones = this.observaciones.trim();
    switch (this.accion) {
      case 'envio':
        if (this.idLaboratorio) {
          await this.ejecutar(
            this.api.enviar(orden.id, this.idLaboratorio, this.fecha, observaciones),
            'Envío registrado.',
          );
        }
        break;
      case 'recepcion':
        if (envio)
          await this.ejecutar(this.api.recibir(envio.id, observaciones), 'Recepción registrada.');
        break;
      case 'calidad':
        if (envio && this.politica?.configurada) {
          const confirmado = await this.avisos.confirmar({
            titulo: 'Confirmar control de calidad',
            mensaje: '¿Está seguro de confirmar este control de calidad?',
            textoConfirmar: 'Confirmar control',
          });
          if (!confirmado || this.destroyRef.destroyed) return;

          await this.ejecutar(
            this.api.controlar(envio.id, this.mediciones(orden.lente.medidas), observaciones),
            (control) =>
              control.aprobado
                ? { texto: 'Control aprobado. Pedido listo para entrega.', tipo: 'exito' }
                : {
                    texto:
                      'El lente desaprobó el control de calidad. Puedes reenviarlo al laboratorio.',
                    tipo: 'advertencia',
                  },
          );
        }
        break;
      case 'entrega':
        if (orden.saldoPendiente === 0) {
          await this.ejecutar(this.api.entregar(orden.id, observaciones), 'Entrega registrada.');
        }
        break;
    }
  }

  protected async enviarSms(): Promise<void> {
    if (this.ocupado() || !this.telefonoValido()) return;

    const telefono = this.telefono();
    this.ocupado.set(true);
    let confirmado: boolean;
    try {
      confirmado = await this.avisos.confirmar({
        titulo: 'Enviar SMS',
        mensaje: `¿Confirmas el envío del aviso por SMS al número ${telefono}?`,
        textoConfirmar: 'Enviar SMS',
      });
    } finally {
      this.ocupado.set(false);
    }
    if (!confirmado || this.destroyRef.destroyed) return;

    await this.ejecutar(this.api.sms(this.id, telefono), ({ estado }) => {
      switch (estado) {
        case 'ACEPTADO':
          return {
            texto: 'Textbee aceptó el SMS. La entrega aún no está confirmada.',
            tipo: 'exito',
          };
        case 'FALLIDO':
          return {
            texto:
              'Textbee rechazó el envío. Revisa la configuración antes de volver a intentarlo.',
            tipo: 'advertencia',
          };
        default:
          return {
            texto:
              'No se pudo confirmar el envío. Revisa el historial de Textbee antes de reintentar.',
            tipo: 'advertencia',
          };
      }
    });
  }

  protected async prepararAviso(): Promise<void> {
    if (this.ocupado() || !this.telefonoValido()) return;
    this.ocupado.set(true);
    this.errorAccion.set('');
    this.enlace.set('');
    this.abierto.set(false);
    try {
      const respuesta = await this.leer(this.api.whatsapp(this.id, this.telefono()));
      if (respuesta.enlaceWhatsApp?.startsWith('https://wa.me/')) {
        this.enlace.set(respuesta.enlaceWhatsApp);
      } else {
        await this.cargar();
      }
    } catch (error) {
      if (!this.destroyRef.destroyed) this.errorAccion.set(mensajeErrorHttp(error));
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async confirmarAviso(): Promise<void> {
    if (this.ocupado() || !this.abierto()) return;
    this.ocupado.set(true);
    const confirmado = await this.avisos.confirmar({
      titulo: 'Confirmar aviso por WhatsApp',
      mensaje: `Confirma que enviaste el mensaje al número ${this.telefono()}.`,
      textoConfirmar: 'Registrar aviso',
    });
    this.ocupado.set(false);
    if (confirmado && !this.destroyRef.destroyed) {
      await this.ejecutar(this.api.whatsapp(this.id, this.telefono(), true), 'Aviso confirmado.');
    }
  }

  protected resumenOjo(medida: MedidaOrden, ojo: Ojo): string {
    const valores = medida[ojo];
    return `Esf. ${valores.esfera ?? '—'} · Cil. ${valores.cilindro ?? '—'} · Eje ${valores.eje ?? '—'}° · Ad. ${valores.adicion ?? '—'}`;
  }

  private mediciones(referencias: MedidaOrden[]): Lensometria[] {
    const opcional = (valor: string) => (valor === '' ? null : Number(valor));
    const ojo = (valores: Record<Magnitud, string>) => ({
      esfera: Number(valores.esfera),
      cilindro: Number(valores.cilindro),
      eje: Number(valores.eje),
      adicion: opcional(valores.adicion),
    });
    return referencias.map(({ tipoMedida }, i) => ({
      tipoMedida,
      distanciaPupilar: Number(this.captura[i].distanciaPupilar),
      prisma: opcional(this.captura[i].prisma),
      ojoDerecho: ojo(this.captura[i].ojoDerecho),
      ojoIzquierdo: ojo(this.captura[i].ojoIzquierdo),
    }));
  }

  private leer<T>(consulta: Observable<T>): Promise<T> {
    return firstValueFrom(consulta.pipe(takeUntilDestroyed(this.destroyRef)));
  }

  private async ejecutar<T>(
    consulta: Observable<T>,
    mensaje: string | ((respuesta: T) => { texto: string; tipo: 'exito' | 'advertencia' }),
  ): Promise<void> {
    this.ocupado.set(true);
    this.resultado.set(null);
    this.errorAccion.set('');
    try {
      const respuesta = await this.leer(consulta);
      this.accion = null;
      this.enlace.set('');
      this.abierto.set(false);
      this.resultado.set(
        typeof mensaje === 'string' ? { texto: mensaje, tipo: 'exito' } : mensaje(respuesta),
      );
      await this.cargar();
    } catch (error) {
      if (this.destroyRef.destroyed) return;
      this.errorAccion.set(mensajeErrorHttp(error));
      const anterior = this.orden()?.estado;
      await this.cargar();
      if (this.orden()?.estado !== anterior) this.accion = null;
    } finally {
      this.ocupado.set(false);
    }
  }
}
