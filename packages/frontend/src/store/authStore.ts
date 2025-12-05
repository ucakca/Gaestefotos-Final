import { create } from 'zustand';
import { User } from '@gaestefotos/shared';
import { authApi } from '@/lib/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: false,
  loading: false,

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { user, token } = await authApi.login({ email, password });
      set({ user, token, isAuthenticated: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ loading: true });
    try {
      const { user, token } = await authApi.register({ name, email, password });
      set({ user, token, isAuthenticated: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: () => {
    authApi.logout();
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    set({ loading: true });
    try {
      const { user } = await authApi.getMe();
      set({ user, isAuthenticated: true, loading: false });
    } catch (error) {
      set({ user: null, token: null, isAuthenticated: false, loading: false });
    }
  },
}));

