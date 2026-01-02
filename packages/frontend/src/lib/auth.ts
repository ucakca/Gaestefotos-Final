import api from './api';
import { User } from '@gaestefotos/shared';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await api.post('/auth/register', data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  getMe: async (): Promise<{ user: User }> => {
    try {
      const { data } = await api.get('/auth/me');
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    }
  },
};

