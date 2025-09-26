// src/components/ObjectiveCard.tsx

import type { Objective, KeyResult, Kpi, KpiDataPoint } from '../types';
import { KeyResultSection } from './KeyResultSection';
import { Flag } from 'lucide-react';

interface ObjectiveCardProps {
  objective: Objective;
  keyResults: KeyResult[];
  kpis: Kpi[];
  results: KpiDataPoint[];
}

export function ObjectiveCard({ objective, keyResults, kpis, results }: ObjectiveCardProps) {
  // Filtramos los Resultados Clave para quedarnos solo con los que pertenecen a este Objetivo
  const relevantKeyResults = keyResults.filter(kr => kr.ID_Objetivo_Asociado === objective.ID_Objetivo);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8 border border-slate-200">
      {/* Encabezado del Objetivo */}
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-slate-800 p-3 rounded-lg">
            <Flag className="text-white" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{objective.Nombre_Objetivo}</h1>
      </div>

      {/* Renderizamos una sección por cada Resultado Clave */}
      {relevantKeyResults.map(keyResult => (
        <KeyResultSection
          key={keyResult.ID_Resultado_Clave}
          keyResult={keyResult}
          kpis={kpis}
          results={results}
        />
      ))}
    </div>
  );
}