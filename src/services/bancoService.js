import { fetchWithAuth } from './apiClient';

export const getConnectedBanksApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/bancos/connected?${params.toString()}`, sessionId);
};

export const getMovimientosBancariosApi = (sessionId, empresaId) => {
    const params = new URLSearchParams({ empresaId });
    return fetchWithAuth(`/bancos/movimientos?${params.toString()}`, sessionId);
};

export const uploadCartolaApi = async (sessionId, empresaId, movimientos) => {
    return fetchWithAuth(`/bancos/cartola?empresaId=${empresaId}`, sessionId, {
        method: 'POST',
        body: JSON.stringify({ movimientos })
    });
};

export const connectBankApi = (sessionId, empresaId, bankData) => {
    return fetchWithAuth(`/bancos/connect?empresaId=${empresaId}`, sessionId, {
        method: 'POST',
        body: JSON.stringify(bankData)
    });
};

export const autoConciliarApi = (sessionId, empresaId) => {
    return fetchWithAuth(`/bancos/conciliar/auto?empresaId=${empresaId}`, sessionId, {
        method: 'POST'
    });
};

export const disconnectBankApi = (sessionId, empresaId, bancoId) => {
    return fetchWithAuth(`/bancos/connect/${bancoId}?empresaId=${empresaId}`, sessionId, {
        method: 'DELETE'
    });
};

export const updateEstadoMovimientoApi = (sessionId, empresaId, movimientoId, data) => {
    return fetchWithAuth(`/bancos/movimientos/${movimientoId}?empresaId=${empresaId}`, sessionId, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
};