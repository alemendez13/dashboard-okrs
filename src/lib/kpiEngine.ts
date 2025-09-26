// src/lib/kpiEngine.ts
import type { UserRole, ImprovementDirection, KpiFrequency, KpiAggregation } from '../types';
import type { Kpi, KpiDataPoint } from '../types';

const getISOWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getGroupKey = (date: Date, frequency: KpiFrequency): string => {
  const year = date.getFullYear();
  switch (frequency) {
    case 'Semanal':
      const week = getISOWeek(date);
      return `${year}-W${String(week).padStart(2, '0')}`;
    case 'Mensual':
      const month = date.getMonth() + 1;
      return `${year}-M${String(month).padStart(2, '0')}`;
    case 'Anual':
    default:
      return String(year);
  }
};

const calculateProgress = (currentValue: number, base: number, target: number, direction: ImprovementDirection): number => {
    if (target === base) return currentValue >= target ? 100 : 0;
    
    const progress = ((currentValue - base) / (target - base)) * 100;

    if (direction === 'Descendente') {
        // Si la meta es Bajar (ej. costos de 100 a 80), un valor más bajo es mejor.
        // El progreso se invierte.
        return 100 - progress;
    }
    
    // Para metas ascendentes
    return Math.max(0, Math.min(progress, 100)); // Asegura que el progreso esté entre 0 y 100
};

export const processKpiData = (kpi: Kpi, results: KpiDataPoint[], userRole: UserRole) => {
  const relevantResults = results.filter(r => r.ID_KPI === kpi.ID_KPI);

  const groupedResults = relevantResults.reduce((acc, result) => {
    const date = new Date(result.Fecha);
    if (isNaN(date.getTime())) return acc;

    const key = getGroupKey(date, kpi.Frecuencia);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(result.Valor);
    return acc;
  }, {} as Record<string, number[]>);

  const processedData = Object.entries(groupedResults).map(([period, values]) => {
    let aggregatedValue: number;
    if (kpi.Metodo_Agregacion === 'Sumar') {
      aggregatedValue = values.reduce((sum, val) => sum + val, 0);
    } else { // 'Promediar'
      aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    let displayValue = aggregatedValue;
    let displayUnit = kpi.Unidad;
    let isMasked = false;

    if (kpi.Es_Financiero && userRole !== 'admin') {
      displayValue = kpi.Meta > 0 ? (aggregatedValue / kpi.Meta) * 100 : 0;
      displayUnit = '%';
      isMasked = true;
    }
    
    const progress = calculateProgress(
        aggregatedValue,
        kpi.Linea_Base || 0,
        kpi.Meta,
        kpi.Direccion_Mejora
    );

    return {
      period,
      value: displayValue,
      unit: displayUnit,
      isMasked,
      progress
    };
  });

  // Ordenar por período para asegurar que el último es el más reciente
  return processedData.sort((a, b) => a.period.localeCompare(b.period));
};
