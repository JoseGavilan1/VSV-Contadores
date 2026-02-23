import { fetchWithAuth } from './apiClient';
import { mapperToSnake } from '@/lib/mappers';

export const getUsersApi = (sessionId, { page = 0, limit = 10, search = '' } = {}) => {
    const params = new URLSearchParams({ page, limit, search });
    
    return fetchWithAuth(`/users?${params.toString()}`, sessionId);
};

export const saveUserApi = (userData, sessionId) => {
    const isEdit = !!userData.id;
    
    return fetchWithAuth(
        isEdit ? `/users/${userData.id}` : `/users`, 
        sessionId, 
        {
            method: isEdit ? 'PUT' : 'POST',
            body: userData,
        }
    );
};

export const deleteUserApi = (userId, sessionId) =>
    fetchWithAuth(`/users/${userId}`, sessionId, { method: 'DELETE' });