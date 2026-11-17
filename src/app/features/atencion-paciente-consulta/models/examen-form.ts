import { FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';

export type TipoMedida = 'LEJOS' | 'MEDIO' | 'CERCA';
export const pasoDioptrico: ValidatorFn = (c) =>
  c.value === null ||
  c.value === '' ||
  (Number.isFinite(c.value) && Math.abs(c.value * 4 - Math.round(c.value * 4)) < 1e-8)
    ? null
    : { paso: true };
const entero: ValidatorFn = (c) =>
  c.value === null || Number.isInteger(c.value) ? null : { entero: true };
const precision: ValidatorFn = (c) =>
  c.value === null ||
  (Number.isFinite(c.value) && Math.abs(c.value * 100 - Math.round(c.value * 100)) < 1e-8)
    ? null
    : { precision: true };
const numero = (min: number, max: number, extra: ValidatorFn[] = []) =>
  new FormControl<number | null>(null, [
    Validators.min(min),
    Validators.max(max),
    precision,
    ...extra,
  ]);
const ojo = () =>
  new FormGroup({
    esfera: numero(-999.99, 999.99, [pasoDioptrico]),
    cilindro: numero(-999.99, 999.99, [pasoDioptrico]),
    eje: numero(0, 180, [entero]),
    adicion: numero(-99.99, 99.99, [pasoDioptrico]),
    agudezaVisual: new FormControl('', { nonNullable: true, validators: Validators.maxLength(50) }),
  });
export function crearMedida(tipo: TipoMedida = 'LEJOS') {
  return new FormGroup({
    tipoMedida: new FormControl<TipoMedida>(tipo, {
      nonNullable: true,
      validators: Validators.required,
    }),
    distanciaPupilar: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(999.99),
      precision,
    ]),
    prisma: numero(0, 999.99),
    observaciones: new FormControl('', {
      nonNullable: true,
      validators: Validators.maxLength(255),
    }),
    ojoDerecho: ojo(),
    ojoIzquierdo: ojo(),
  });
}
export type GrupoMedida = ReturnType<typeof crearMedida>;
export type MedidasArray = FormArray<GrupoMedida>;
export interface ExamenRequest {
  idPaciente: number;
  idEmpleado: number;
  esExterno: 0 | 1;
  medidas: ReturnType<GrupoMedida['getRawValue']>[];
}
