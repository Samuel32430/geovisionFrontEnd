export interface VentasDelDia {
  total: number;
  cantidad: number;
}

export interface OrdenesActivas {
  enProceso: number;
  listasParaEntrega: number;
}

export interface AtencionDelDia {
  idReceta: number;
  idPaciente: number;
  paciente: string;
  fechaRegistro: string;
}

export interface AtencionesDelDia {
  pacientes: number;
  primerasVeces: number;
  totalConsultas: number;
  recientes: AtencionDelDia[];
}
