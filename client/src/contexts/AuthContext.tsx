import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { authenticateUser, verifyToken, AuthResponse, LoginCredentials } from '../services/auth';

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
        const validateToken = async () => {
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
        validateToken();
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