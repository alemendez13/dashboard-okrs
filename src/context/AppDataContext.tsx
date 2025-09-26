import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppData } from '../types';
import { fetchAllData } from '../api/googleSheetsService';

// 1. Definimos la "forma" que tendrán nuestros datos en el contexto.
interface AppDataContextType {
  data: AppData | null;
  loading: boolean;
  error: Error | null;
}

// 2. Creamos el Context. Es como un canal de radio al que los componentes se suscribirán.
const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// 3. Este es el componente principal de este archivo.
//    Se encargará de obtener los datos y "emitirlos" por el canal del Context.
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // 4. useEffect se ejecuta una vez cuando el componente se monta.
  //    Es el lugar perfecto para llamar a nuestra API.
  useEffect(() => {
    const loadData = async () => {
      try {
        // Llamamos a la función que ya tenías en googleSheetsService
        const result = await fetchAllData();
        setData(result);
      } catch (err) {
        // Tu lógica de 'catch' está perfecta aquí.
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error('Ocurrió un error desconocido'));
        }
      } finally {
        // Ocurra lo que ocurra, la carga termina.
        setLoading(false);
      }
    };
    loadData();
  }, []); // El array vacío asegura que solo se ejecute una vez.

  // 5. El Provider "envuelve" a los componentes hijos (tu app)
  //    y les da acceso a los valores (data, loading, error).
  return (
    <AppDataContext.Provider value={{ data, loading, error }}>
      {children}
    </AppDataContext.Provider>
  );
}

// 6. Creamos un "hook" personalizado.
//    Esto es un atajo para que los otros componentes accedan a los datos
//    de forma fácil y segura, en lugar de usar useContext directamente.
export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData debe ser usado dentro de un AppDataProvider');
  }
  return context;
}