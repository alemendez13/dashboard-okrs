// src/components/KpiCard.tsx
import type { Kpi, KpiDataPoint } from '../types';
import { processKpiData } from '../lib/kpiEngine';
import { Target } from 'lucide-react';

interface KpiCardProps {
  kpi: Kpi;
  results: KpiDataPoint[];
}

export function KpiCard({ kpi, results }: KpiCardProps) {
  if (!Array.isArray(results)) {
    return <div className="text-red-500 p-4">Error: Faltan los datos de resultados para este KPI.</div>;
  }
  
  const processedData = processKpiData(kpi, results, 'admin');

  const latestPeriod = processedData.length > 0 ? processedData[processedData.length - 1] : null;

  const progress = latestPeriod ? latestPeriod.progress : 0;
  const progressColor = progress >= 100 ? 'bg-green-500' : 'bg-blue-500';

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Target className="text-blue-600" size={20} />
        </div>
        <h3 className="font-bold text-slate-800 text-md flex-1">{kpi.Nombre_KPI}</h3>
      </div>

      {latestPeriod ? (
        <div className="text-center">
          <p className="text-4xl font-bold text-slate-900">
            {latestPeriod.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            <span className="text-xl font-semibold text-slate-500 ml-1">{latestPeriod.unit}</span>
          </p>
          <p className="text-sm text-slate-500">Último período: {latestPeriod.period}</p>
        </div>
      ) : (
        <p className="text-center text-slate-500">Sin datos</p>
      )}

      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-slate-700">Progreso hacia la meta</span>
          <span className="text-sm font-bold text-slate-700">{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div className={`${progressColor} h-2.5 rounded-full`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
        </div>
      </div>
    </div>
  );
}

