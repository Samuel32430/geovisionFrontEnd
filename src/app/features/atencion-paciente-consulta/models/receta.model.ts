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
