import { create } from 'zustand';
import { User } from '@gaestefotos/shared';
import { authApi } from '@/lib/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  hasCheckedAuth: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token:
    typeof window !== 'undefined'
      ? (sessionStorage.getItem('token') || localStorage.getItem('token'))
      : null,
  isAuthenticated:
    typeof window !== 'undefined'
      ? Boolean(sessionStorage.getItem('token') || localStorage.getItem('token'))
      : false,
  loading: false,
  hasCheckedAuth: false,

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { user, token } = await authApi.login({ email, password });
      if (typeof window !== 'undefined') {
        // Default: persist in localStorage for consistency with E2E and existing token usage.
        localStorage.setItem('token', token);
        sessionStorage.removeItem('token');
      }
      set({ user, token, isAuthenticated: true, loading: false, hasCheckedAuth: true });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ loading: true });
    try {
      const { user, token } = await authApi.register({ name, email, password });
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        sessionStorage.removeItem('token');
      }
      set({ user, token, isAuthenticated: true, loading: false, hasCheckedAuth: true });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null, token: null, isAuthenticated: false, hasCheckedAuth: true });
  },

  loadUser: async () => {
    if (typeof window !== 'undefined') {
      const t = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!t) {
        set({ user: null, token: null, isAuthenticated: false, loading: false, hasCheckedAuth: true });
        return;
      }
    }

    set({ loading: true });
    try {
      const { user } = await authApi.getMe();
      set({ user, isAuthenticated: true, loading: false, hasCheckedAuth: true });
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      }
      set({ user: null, token: null, isAuthenticated: false, loading: false, hasCheckedAuth: true });
    }
  },
}));

