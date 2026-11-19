export type Catalogo =
  'categorias' | 'materiales-cristal' | 'tratamientos-cristal' | 'servicios' | 'laboratorios';
export interface RegistroCatalogo {
  id?: number;
  nombre: string;
  descripcion?: string;
  estado?: number;
  precio?: number;
  ruc?: string;
  telefono?: string;
  direccion?: string;
  correo?: string;
}
