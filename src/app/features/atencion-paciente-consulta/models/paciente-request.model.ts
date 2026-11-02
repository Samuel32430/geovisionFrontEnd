import { TipoDocumento } from './paciente.model';

export interface PersonaRequest {
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  fechaNacimiento: string | null;
  sexo: 'MASCULINO' | 'FEMENINO' | null;
  telefono: string | null;
  direccion: string | null;
}

export interface PacienteRequest {
  persona: PersonaRequest;
}
