import { DestroyRef, Directive, ElementRef, inject, OnInit, Renderer2 } from '@angular/core';

/** Cierra un aviso en la vista actual sin alterar sus reglas ni datos. */
@Directive({ selector: '[appAvisoCerrable]' })
export class AvisoCerrable implements OnInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    const host = this.host.nativeElement;
    const boton = this.renderer.createElement('button') as HTMLButtonElement;
    this.renderer.setAttribute(boton, 'type', 'button');
    this.renderer.setAttribute(boton, 'aria-label', 'Cerrar aviso');
    this.renderer.setAttribute(boton, 'title', 'Cerrar aviso');
    this.renderer.addClass(boton, 'aviso-cerrar');
    this.renderer.appendChild(boton, this.renderer.createText('×'));
    this.renderer.setStyle(host, 'position', 'relative');
    this.renderer.setStyle(host, 'padding-right', '48px');
    this.renderer.appendChild(host, boton);
    const quitarListener = this.renderer.listen(boton, 'click', () =>
      this.renderer.setStyle(host, 'display', 'none'),
    );
    this.destroyRef.onDestroy(quitarListener);
  }
}
