// src/types/index.ts

// TIPOS BÁSICOS (ENUMERACIONES)
export type UserRole = 'admin' | 'user';
export type KpiFrequency = 'Anual' | 'Mensual' | 'Semanal';
export type KpiAggregation = 'Promediar' | 'Sumar';

// ¡NUEVO TIPO AÑADIDO!
// Este es el tipo que VSC no encontraba. Ahora lo exportamos.
export type ImprovementDirection = 'Ascendente' | 'Descendente';


// INTERFACES (ESTRUCTURAS DE DATOS)

export interface User {
  ID_Usuario: number;
  Nombre_Completo: string;
  Rol: UserRole;
  Email: string;
}

export interface Objective {
  ID_Objetivo: string;
  Nombre_Objetivo: string;
}

export interface KeyResult {
  ID_Resultado_Clave: string;
  ID_Objetivo_Asociado: string;
  Nombre_Resultado_Clave: string;
  Responsable: string;
  Area: string;
}

export interface Process {
  ID_Proceso: string;
  Nombre_Proceso: string;
  Dueño_Proceso: string;
}

// ¡INTERFAZ CORREGIDA!
// Aquí añadimos las propiedades que faltaban.
export interface Kpi {
  ID_KPI: string;
  Nombre_KPI: string;
  ID_Resultado_Clave: string;
  ID_Proceso_Asc: string;
  ID_Usuario_Res: number;
  Meta: number;
  Linea_Base: number;
  Unidad: string;
  Frecuencia: KpiFrequency;
  Direccion_Mejora: ImprovementDirection;
  Es_Financiero: boolean;
  Metodo_Agregacion: KpiAggregation;
}

export interface KpiDataPoint {
  ID_Resultado: string;
  ID_KPI: string;
  Fecha: string; 
  Valor: number;
  Periodo?: string;
}

// Estructura de datos global que viene de la API
export interface AppData {
  users: User[];
  objectives: Objective[];
  keyResults: KeyResult[];
  processes: Process[];
  kpis: Kpi[];
  results: KpiDataPoint[];
}

