import { apiUrl } from '../config/config';

interface RequestOptions extends RequestInit {
    token?: string;
}

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

export const apiRequest = async <T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> => {
    const { token, ...otherOptions } = options;
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${apiUrl}${endpoint}`, {
        ...otherOptions,
        headers
    });

    if (!response.ok) {
        throw new ApiError(response.status, await response.text());
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : null;
};

export const api = {
    get: <T>(endpoint: string, token?: string) => 
        apiRequest<T>(endpoint, { method: 'GET', token }),
    
    post: <T>(endpoint: string, data: unknown, token?: string) =>
        apiRequest<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            token
        }),
    
    put: <T>(endpoint: string, data: unknown, token?: string) =>
        apiRequest<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            token
        }),
    
    delete: <T>(endpoint: string, token?: string) =>
        apiRequest<T>(endpoint, { method: 'DELETE', token }),
    
    uploadFile: <T>(endpoint: string, file: File, token?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiRequest<T>(endpoint, {
            method: 'POST',
            body: formData,
            token
        });
    }
};