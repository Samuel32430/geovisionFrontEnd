export interface Permiso {
  idPermiso: number;
  nombre: string;
  modulo: string;
  moduloDescripcion: string;
}

export interface Rol {
  idRol: number;
  nombre: string;
  permisos: Permiso[];
}

export interface Usuario {
  idUsuario: number;
  nombre: string;
  correo: string;
  estado: 0 | 1;
  estadoDescripcion: string;
  idPersona: number;
  nombreCompletoPersona: string;
  roles: Rol[];
}

export interface UsuarioCambios {
  nombre: string;
  correo: string;
  idPersona: number;
  password?: string;
  estado: 0 | 1;
}

export interface PersonaParaUsuario {
  idPersona: number;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  tipoDocumento: 'DNI' | 'RUC' | 'CARNET_EXTRANJERIA' | 'PASAPORTE';
  numeroDocumento: string;
  tieneUsuario: boolean;
  idUsuario: number | null;
  nombreUsuario: string | null;
  estadoUsuario: 0 | 1 | null;
  esEmpleado: boolean;
  empleadoActivo: boolean;
}

export interface CuentaUsuarioAlta {
  nombre: string;
  correo: string;
  password: string;
  estado: 0 | 1;
  rolesIds: number[];
}
export interface AltaEmpleado {
  fechaContrato: string;
}
export interface UsuarioExistenteAlta extends CuentaUsuarioAlta {
  idPersona: number;
  empleado?: AltaEmpleado;
}
export interface PersonaNuevaAlta {
  nombres: string;
  apellidos: string;
  tipoDocumento: PersonaParaUsuario['tipoDocumento'];
  numeroDocumento: string;
  fechaNacimiento: string | null;
  sexo: 'MASCULINO' | 'FEMENINO' | null;
  telefono: string | null;
  direccion: string | null;
}
export interface PersonaUsuarioAlta {
  persona: PersonaNuevaAlta;
  usuario: CuentaUsuarioAlta;
  empleado: AltaEmpleado;
}

export const etiquetasPermisos: Record<string, string> = {
  SEGURIDAD_ADMINISTRAR: 'Administrar usuarios, roles y permisos',
  SEGURIDAD_LEER: 'Consultar seguridad',
  PACIENTES_LEER: 'Consultar pacientes e historial',
  PACIENTES_REGISTRAR: 'Registrar pacientes',
  PACIENTES_GESTIONAR: 'Editar y cambiar estado de pacientes',
  EXAMENES_REGISTRAR: 'Registrar exámenes visuales',
  RECETAS_REGISTRAR: 'Registrar recetas y configurar lentes',
  VENTAS_LEER: 'Consultar ventas',
  VENTAS_REGISTRAR: 'Registrar ventas',
  PAGOS_GESTIONAR: 'Gestionar pagos',
  ORDENES_TRABAJO_LEER: 'Consultar órdenes de trabajo',
  ORDENES_TRABAJO_GESTIONAR: 'Gestionar órdenes de trabajo',
  INVENTARIO_LEER: 'Consultar inventario',
  INVENTARIO_GESTIONAR: 'Gestionar inventario',
  MANTENIMIENTO_GESTIONAR: 'Gestionar mantenimiento',
  REPORTES_VER: 'Consultar reportes',
};

export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toLocaleUpperCase('es');
}

export function mismosIds(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}
