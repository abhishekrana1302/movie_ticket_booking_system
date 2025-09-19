import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    phone: string;
  }) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiService.setToken(token);
      getCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const getCurrentUser = async () => {
    try {
      const response = await apiService.get('/auth/me');
      setUser(response.user);
    } catch (error) {
      localStorage.removeItem('token');
      apiService.removeToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiService.post('/auth/login', { email, password });
    const { user, token } = response;
    
    localStorage.setItem('token', token);
    apiService.setToken(token);
    setUser(user);
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
    phone: string;
  }) => {
    const response = await apiService.post('/auth/register', userData);
    const { user, token } = response;
    
    localStorage.setItem('token', token);
    apiService.setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    apiService.removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};