import { fetchWithAuth } from './apiClient';

export const getRentaMetricsApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/renta/metrics?${params.toString()}`, sessionId);
};

export const getAnalisisRentaApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/renta/analisis?${params.toString()}`, sessionId);
};

export const getCalculoImpuestosApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/renta/calculo?${params.toString()}`, sessionId);
};

export const getAnalisisSociosApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/renta/socios?${params.toString()}`, sessionId);
};

export const getDeclaracionesRentaApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/renta/declaraciones?${params.toString()}`, sessionId);
};