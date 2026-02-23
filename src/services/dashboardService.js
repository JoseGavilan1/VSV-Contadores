import { fetchWithAuth } from './apiClient';

export const getDashboardApi = (sessionId, empresaId) => {
    const endpoint = `/dashboard?empresaId=${empresaId}`;
    return fetchWithAuth(endpoint, sessionId);
};