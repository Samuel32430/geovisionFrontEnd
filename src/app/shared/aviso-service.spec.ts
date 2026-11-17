import { AvisoService } from './aviso-service';

describe('AvisoService', () => {
  it('should confirm only after the explicit primary action', async () => {
    const service = new AvisoService();
    const result = service.confirmar({
      titulo: '¿Archivar evaluación?',
      mensaje: 'La evaluación quedará inactiva.',
      peligrosa: true,
    });
    const action = service.actual()!.acciones![0];
    expect(action.estilo).toBe('peligro');
    service.ejecutar(action);
    expect(await result).toBe(true);
    expect(service.actual()).toBeNull();
  });

  it('should cancel when dismissed or replaced by another message', async () => {
    const service = new AvisoService();
    const dismissed = service.confirmar({ titulo: 'Confirmar', mensaje: 'Prueba' });
    service.cerrar();
    expect(await dismissed).toBe(false);
    const replaced = service.confirmar({ titulo: 'Confirmar', mensaje: 'Prueba' });
    service.pendiente('Agenda');
    expect(await replaced).toBe(false);
    expect(service.actual()?.titulo).toBe('Agenda no disponible');
  });

  it('should let the feature handle a success action and open a subsequent message', () => {
    const service = new AvisoService();
    const action = { etiqueta: 'Imprimir', ejecutar: () => service.pendiente('Impresión') };
    service.abrir({
      tipo: 'exito',
      titulo: 'Guardado',
      mensaje: 'Registro guardado.',
      acciones: [action],
    });
    service.ejecutar(action);
    expect(service.actual()?.titulo).toBe('Impresión no disponible');
  });
});
