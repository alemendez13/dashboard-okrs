import { AppData } from '../types';

// La URL ahora se carga de forma segura desde las variables de entorno
const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

/**
 * Realiza una única llamada a la API de Google Apps Script para obtener todos los datos.
 * Esto es eficiente porque agrupa todas las solicitudes de datos en una sola.
 * @returns Una promesa que se resuelve con un objeto que contiene todos los datos de la aplicación.
 */
export const fetchAllData = async (): Promise<AppData> => {
  try {
    // Usamos la API 'fetch' del navegador para hacer una solicitud GET a nuestro script.
    const response = await fetch(SCRIPT_URL);

    // Si la respuesta no es exitosa (ej. error 500 en el servidor), lanzamos un error.
    if (!response.ok) {
      throw new Error(`Error en la red: ${response.statusText}`);
    }

    // Convertimos la respuesta de texto a un objeto JSON.
    const data = await response.json();

    // Si el JSON de respuesta contiene una propiedad de error (definida en nuestro Apps Script),
    // significa que el script tuvo un problema, por lo que lanzamos ese error.
    if (data.error) {
      throw new Error(`Error en el script de Google: ${data.error}`);
    }

    // --- LÍNEA DE DIAGNÓSTICO A ELIMINAR ---
// console.log('Respuesta cruda de la API:', data);
// --- FIN DE LA LÍNEA DE DIAGNÓSTICO ---
return data as AppData;

  } catch (error) {
    // Si ocurre cualquier error durante el proceso (red, JSON malformado, etc.),
    // lo mostramos en la consola para depuración y lanzamos el error para que
    // el resto de la aplicación sepa que la obtención de datos falló.
    console.error("Falló la obtención de datos desde Google Sheets:", error);
    throw error; // Re-lanzamos el error para que el componente que llama pueda manejarlo.
  }
};

