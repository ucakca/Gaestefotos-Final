import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN';
}

interface AuthState {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  login: (token: string, admin: AdminUser) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAdminAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated });
      },
      login: (token: string, admin: AdminUser) => {
        set({ token, admin, isAuthenticated: true });
        if (typeof document !== 'undefined') {
          document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;
        }
      },
      logout: () => {
        set({ admin: null, token: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin-auth-storage');
        }
        if (typeof document !== 'undefined') {
          document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax; Secure';
        }
      },
      setToken: (token: string) => {
        set({ token, isAuthenticated: !!token });
      },
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        token: state.token,
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          state?.setHasHydrated(true);
          if (state?.token) {
            state.setToken(state.token);
            if (typeof document !== 'undefined') {
              document.cookie = `auth_token=${state.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;
            }
          }
        };
      },
    }
  )
);

