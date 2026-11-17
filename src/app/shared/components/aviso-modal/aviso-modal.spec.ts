import { TestBed } from '@angular/core/testing';
import { AvisoService } from '../../aviso-service';
import { AvisoModal } from './aviso-modal';

describe('AvisoModal', () => {
  it('should expose shared messages and close using its button or Escape', async () => {
    await TestBed.configureTestingModule({ imports: [AvisoModal] }).compileComponents();
    // jsdom does not implement the browser's native modal dialog API.
    const fixture = TestBed.createComponent(AvisoModal);
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = () => {
      dialog.open = true;
    };
    dialog.close = () => {
      dialog.open = false;
    };
    const avisos = TestBed.inject(AvisoService);
    fixture.detectChanges();
    avisos.pendiente('Nueva venta');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Nueva venta no disponible');
    (dialog.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(avisos.actual()).toBeNull();
    avisos.abrir({
      titulo: 'No se pudo completar el proceso',
      mensaje: 'Intenta nuevamente.',
      tipo: 'error',
    });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.textContent).toContain('Intenta nuevamente.');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    expect(avisos.actual()).toBeNull();
  });
});
