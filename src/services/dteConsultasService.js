import { API_BASE_URL } from "../../config.js";

/**
 * Función para pedir el historial de una empresa específica a la API
 */
export const obtenerHistorialBunker = async (empresaId) => {
    try {
        // Llamamos a la ruta que definimos en el server.js (/api/dte-consulta)
        const response = await fetch(`${API_BASE_URL}/dte-consulta/historial?empresa_id=${empresaId}`);
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al sincronizar con el servidor');
        }

        return data; // Devuelve { ok: true, documentos: [...] }
    } catch (error) {
        console.error("❌ Error en dteConsultasService:", error);
        throw error;
    }
};