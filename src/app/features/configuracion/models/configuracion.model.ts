export interface ConfiguracionEmpresa {
  id?: number | null;
  nombreLegal: string;
  nombreComercial?: string | null;
  ruc: string;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  logo?: string | null;
}
