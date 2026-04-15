import { API_BASE_URL } from "../../config.js";

export const obtenerHistorialBunker = async (empresaId) => {
    const res = await fetch(`${API_BASE_URL}/dte-consulta/historial?empresa_id=${empresaId}`);
    return await res.json();
};

export const obtenerComprasBunker = async (empresaId) => {
    const res = await fetch(`${API_BASE_URL}/dte-consulta/compras?empresa_id=${empresaId}`);
    return await res.json();
};