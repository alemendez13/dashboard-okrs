// src/components/Dashboard.tsx

import { useAppData } from '../context/AppDataContext';
import { ObjectiveCard } from './ObjectiveCard';

export function Dashboard() {
  const { data, loading, error } = useAppData();

  // 1. Mantenemos el manejador de carga. Es el primer guardia.
  if (loading) {
    return <p className="text-center p-10 text-slate-500">Cargando tablero...</p>;
  }

  // 2. Mantenemos el manejador de errores de red. Es el segundo guardia.
  if (error) {
    return <p className="text-center p-10 text-red-600">Error al cargar: {error.message}</p>;
  }
  
  // 3. Si no está cargando y no hay error, CONFIAMOS en que 'data' está presente.
  //    Renderizamos la lista de objetivos. Si 'data.objectives' está vacío, .map() simplemente
  //    no renderizará nada, lo cual es el comportamiento correcto y no rompe la app.
  return (
    <div className="p-4 sm:p-6 lg-p-8">
      {data?.objectives?.map(objective => (
        <ObjectiveCard
          key={objective.ID_Objetivo}
          objective={objective}
          keyResults={data.keyResults}
          kpis={data.kpis}
          results={data.results}
        />
      ))}
    </div>
  );
}