import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface LoginCredentials {
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        username: string;
        role: string;
    };
}

export type { LoginCredentials };

interface AuthContextType {
    user: AuthResponse['user'] | null;
    token: string | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

interface AuthProviderProps {
    children: ReactNode;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const authenticateUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/login', credentials);
};

export const verifyToken = async (token: string): Promise<{ user: AuthResponse['user'] }> => {
    return api.get<{ user: AuthResponse['user'] }>('/auth/verify', token);
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<AuthResponse['user'] | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem('token');
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkToken = async () => {
            if (token) {
                try {
                    const response = await verifyToken(token);
                    setUser(response.user);
                } catch (error) {
                    logout();
                }
            }
            setIsLoading(false);
        };

        checkToken();
    }, [token]);

    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        try {
            const response = await authenticateUser(credentials);
            setUser(response.user);
            setToken(response.token);
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            isAuthenticated: !!token && !!user,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
};