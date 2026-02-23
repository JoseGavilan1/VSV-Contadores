import { fetchWithAuth } from './apiClient';

export const loginApi = (email, clave) => {
    return fetchWithAuth('/auth/login', null, {
        method: 'POST',
        body: { 
            email: email.toLowerCase().trim(),
            clave 
        },
    });
};

export const logoutApi = (sessionId) => {
    return fetchWithAuth('/auth/logout', sessionId, {
        method: 'POST'
    });
};