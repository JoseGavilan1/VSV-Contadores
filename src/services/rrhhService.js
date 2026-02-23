import { fetchWithAuth } from './apiClient';

// Metrics RRHH

export const getRrhhMetricsApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId: empresaId });
    
    return fetchWithAuth(`/rrhh/metrics?${params.toString()}`, sessionId);
};

// Empleados RRHH

export const getEmployeesApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/rrhh/empleados?${params.toString()}`, sessionId);
};

// Liquidaciones RRHH

export const getLiquidacionesApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/rrhh/liquidaciones?${params.toString()}`, sessionId);
};

// Documentos RRHH

export const getDocumentsApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/rrhh/documentos?${params.toString()}`, sessionId);
};

// Control de Asistencia RRHH

export const getAsistenciaApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/rrhh/asistencia?${params.toString()}`, sessionId);
};

// Reportes RRHH

export const downloadReporteApi = (sessionId, empresaId, tipoReporte) => {
    const params = new URLSearchParams({ empresaId, tipoReporte });
    return fetchWithAuth(`/rrhh/reportes/download?${params.toString()}`, sessionId);
};

// Configuración RRHH

export const getRrhhConfigApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/rrhh/config?${params.toString()}`, sessionId);
};

export const updateRrhhConfigApi = async (sessionId, empresaId, data) => {
    return fetchWithAuth(`/rrhh/config?empresaId=${empresaId}`, sessionId, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
};