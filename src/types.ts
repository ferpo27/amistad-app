// src/types.ts

// Tipos básicos
export type Id = string | number;
export type Fecha = string | Date;

// Interfaces comunes
export interface Paginacion {
  pagina: number;
  limite: number;
  total: number;
}

export interface Respuesta<T> {
  datos: T;
  errores: string[];
  mensaje: string;
}

export interface Error {
  codigo: number;
  mensaje: string;
}

// Tipos de datos para autenticación
export interface Usuario {
  id: Id;
  nombre: string;
  correo: string;
  contraseña: string;
}

export interface Token {
  token: string;
  expires: Fecha;
}

// Tipos de datos para la aplicación
export interface Articulo {
  id: Id;
  titulo: string;
  contenido: string;
  fechaCreacion: Fecha;
}

export interface Comentario {
  id: Id;
  contenido: string;
  fechaCreacion: Fecha;
  articuloId: Id;
}