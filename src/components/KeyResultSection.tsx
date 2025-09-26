// src/components/KeyResultSection.tsx

import type { KeyResult, Kpi, KpiDataPoint } from '../types';
import { KpiCard } from './KpiCard';

interface KeyResultSectionProps {
  keyResult: KeyResult;
  kpis: Kpi[];
  results: KpiDataPoint[];
}

export function KeyResultSection({ keyResult, kpis, results }: KeyResultSectionProps) {
  // Filtramos los KPIs para quedarnos solo con los que pertenecen a este Resultado Clave
  const relevantKpis = kpis.filter(kpi => kpi.ID_Resultado_Clave === keyResult.ID_Resultado_Clave);

  return (
    <div className="mb-8">
      {/* Título del Resultado Clave */}
      <h2 className="text-xl font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-300">
        {keyResult.Nombre_Resultado_Clave}
      </h2>
      
      {/* Cuadrícula para los KPIs de esta sección */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {relevantKpis.map(kpi => (
          <KpiCard key={kpi.ID_KPI} kpi={kpi} results={results} />
        ))}
      </div>
    </div>
  );
}