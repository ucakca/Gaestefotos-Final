import { create } from 'zustand';
import { User } from '@gaestefotos/shared';
import { authApi } from '@/lib/auth';

/**
 * Auth Store - Cookie-based Authentication
 * 
 * Token storage strategy:
 * - PRIMARY: httpOnly cookie (set by backend, most secure)
 * - FALLBACK: localStorage (for backwards compatibility with existing sessions)
 * 
 * The backend sets an httpOnly cookie 'auth_token' on login/register.
 * This store no longer manages the token directly - it relies on cookies.
 */

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  hasCheckedAuth: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

// Helper to clear legacy token storage
const clearLegacyTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  hasCheckedAuth: false,

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { user } = await authApi.login({ email, password });
      // Backend sets httpOnly cookie - no need to store token client-side
      clearLegacyTokens();
      set({ user, isAuthenticated: true, loading: false, hasCheckedAuth: true });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ loading: true });
    try {
      const { user } = await authApi.register({ name, email, password });
      // Backend sets httpOnly cookie - no need to store token client-side
      clearLegacyTokens();
      set({ user, isAuthenticated: true, loading: false, hasCheckedAuth: true });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    await authApi.logout();
    clearLegacyTokens();
    set({ user: null, isAuthenticated: false, hasCheckedAuth: true });
  },

  loadUser: async () => {
    set({ loading: true });
    try {
      // Auth is determined by httpOnly cookie - just try to fetch user
      const { user } = await authApi.getMe();
      clearLegacyTokens(); // Clean up any legacy tokens
      set({ user, isAuthenticated: true, loading: false, hasCheckedAuth: true });
    } catch (error) {
      clearLegacyTokens();
      set({ user: null, isAuthenticated: false, loading: false, hasCheckedAuth: true });
    }
  },
}));

