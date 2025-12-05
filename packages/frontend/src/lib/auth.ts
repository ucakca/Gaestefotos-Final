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
      if (typeof window !== 'undefined' && data.token) {
        localStorage.setItem('token', data.token);
      }
      return data;
    } catch (error: any) {
      console.error('Login API error:', error);
      throw error;
    }
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await api.post('/auth/register', data);
      if (typeof window !== 'undefined' && response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error: any) {
      console.error('Register API error:', error);
      throw error;
    }
  },

  getMe: async (): Promise<{ user: User }> => {
    try {
      const { data } = await api.get('/auth/me');
      return data;
    } catch (error: any) {
      console.error('GetMe API error:', error);
      throw error;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  },
};

