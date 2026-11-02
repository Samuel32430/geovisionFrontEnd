import { crearMedida } from './examen-form';
describe('Validación de medidas', () => {
  it('exige DP positiva y admite valores oculares no registrados', () => {
    const m = crearMedida();
    expect(m.valid).toBe(false);
    m.controls.distanciaPupilar.setValue(63);
    expect(m.valid).toBe(true);
    m.controls.distanciaPupilar.setValue(0);
    expect(m.valid).toBe(false);
  });
  it('rechaza dioptrías sin paso de 0.25 y ejes fuera de rango o fraccionarios', () => {
    const ojo = crearMedida().controls.ojoDerecho;
    ojo.controls.esfera.setValue(1.1);
    expect(ojo.invalid).toBe(true);
    ojo.controls.esfera.setValue(-1.25);
    expect(ojo.valid).toBe(true);
    for (const eje of [-1, 181, 90.5]) {
      ojo.controls.eje.setValue(eje);
      expect(ojo.invalid).toBe(true);
    }
    ojo.controls.eje.setValue(180);
    expect(ojo.valid).toBe(true);
  });
  it('limita precisión, tamaño y observaciones como el contrato', () => {
    const m = crearMedida();
    m.controls.distanciaPupilar.setValue(63.001);
    expect(m.invalid).toBe(true);
    m.controls.distanciaPupilar.setValue(63);
    m.controls.observaciones.setValue('a'.repeat(256));
    expect(m.invalid).toBe(true);
    m.controls.observaciones.setValue('a'.repeat(255));
    expect(m.valid).toBe(true);
    m.controls.prisma.setValue(-1);
    expect(m.invalid).toBe(true);
  });
});
