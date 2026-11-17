export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tipoToken: string;
  idUsuario: number;
  username: string;
  correo: string;
  idPersona: number | null;
  nombreCompleto: string;
  roles: string[];
  permisos: string[];
}

export interface Sesion extends LoginResponse {
  expiraEn: number;
}

export type LoginResponseApi = Omit<LoginResponse, 'idUsuario'> & {
  id?: number;
  idUsuario?: number;
};

export interface RecuperarPasswordRequest {
  correo: string;
}

export interface ResetPasswordRequest {
  token: string;
  nuevoPassword: string;
  confirmarPassword: string;
}

export interface MensajeRespuesta {
  mensaje: string;
}

export interface ValidarTokenRespuesta {
  valido: boolean;
}

export function retornoSeguro(valor: string | null): string {
  return valor &&
    valor.startsWith('/') &&
    !valor.startsWith('//') &&
    !/[\\\u0000-\u001f]/.test(valor) &&
    !/^\/login(?:[/?#]|$)/.test(valor)
    ? valor
    : '/inicio';
}
