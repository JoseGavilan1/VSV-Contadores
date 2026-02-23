export const getReportApi = (sessionId, empresaId, tipo, fechas) => {
    const query = `empresaId=${empresaId}&tipo=${tipo}&desde=${fechas.desde}&hasta=${fechas.hasta}`;
    
    return fetchWithAuth(
        `/reports/generate?${query}`, 
        sessionId
    );
};