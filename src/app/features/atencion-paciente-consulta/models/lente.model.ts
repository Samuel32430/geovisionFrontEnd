export interface MaterialCristal {
  idMaterialCristal: number;
  nombre: string;
}
export interface TratamientoCristal {
  idTratamientoCristal: number;
  nombre: string;
}
export interface Montura {
  idProducto: number;
  codigo: string;
  nombre: string;
  precio: number;
  stock: number;
  color: string | null;
  modeloDescripcion: string | null;
  materialDescripcion: string | null;
}
export interface LenteRequest {
  idReceta: number;
  idMaterialCristal: number;
  idProducto: number | null;
  subTotal: number;
  tratamientosCristalIds: number[];
  medidasIds: number[];
}
