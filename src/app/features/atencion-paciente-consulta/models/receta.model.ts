/** Datos de RecetaResponseDTO utilizados en la tabla de recetas recientes. */
export interface RecetaResumen {
  idReceta: number;
  fechaRegistro: string;
  esExterno: 0 | 1;
  esRecetaExterna: boolean;
  idPaciente: number;
  nombreCompletoPaciente: string;
  numeroDocumentoPaciente: string;
  idEmpleado: number;
  nombreCompletoEmpleado: string | null;
}

export interface MedidaOjo {
  esfera: number | null;
  cilindro: number | null;
  eje: number | null;
  adicion: number | null;
  agudezaVisual: string | null;
}
export interface MedidaDetalle {
  idMedida: number;
  tipoMedida: 'LEJOS' | 'MEDIO' | 'CERCA';
  distanciaPupilar: number;
  prisma: number | null;
  observaciones: string | null;
  ojoDerecho: MedidaOjo;
  ojoIzquierdo: MedidaOjo;
}
export interface RecetaDetalle extends RecetaResumen {
  medidas: MedidaDetalle[];
  lentes: {
    idLente: number;
    subTotal: number | null;
    nombreMaterialCristal: string | null;
    nombreMontura: string | null;
    codigoMontura: string | null;
    tratamientos: { nombre: string }[];
  }[];
}
