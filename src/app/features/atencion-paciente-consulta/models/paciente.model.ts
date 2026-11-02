import { PaginaResponse } from '../../../core/models/pagina-response';

export type EstadoPaciente = 0 | 1;
export type TipoDocumento = 'DNI' | 'RUC' | 'CARNET_EXTRANJERIA' | 'PASAPORTE';

export interface PersonaPaciente {
  idPersona: number;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  telefono: string | null;
  fechaNacimiento: string | null;
  sexo: 'MASCULINO' | 'FEMENINO' | null;
  sexoDescripcion: string | null;
  direccion: string | null;
  tipoDocumento: TipoDocumento;
  tipoDocumentoDescripcion: string;
  numeroDocumento: string;
}

export interface Paciente {
  idPersona: number;
  persona: PersonaPaciente;
  estado: EstadoPaciente;
  estadoDescripcion: string;
  fechaRegistro: string;
  idUsuario: number | null;
}

export type PaginaPacientes = PaginaResponse<Paciente>;

export interface ConsultaPacientes {
  termino: string;
  estado: EstadoPaciente;
  page: number;
  size: number;
}
