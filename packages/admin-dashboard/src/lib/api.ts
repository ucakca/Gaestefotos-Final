import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ensureApiBase = (raw: string): string => {
  const trimmed = String(raw || '').trim().replace(/\/+$/g, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser: always same-origin in production; allow explicit override only for local dev/E2E.
    if (process.env.NODE_ENV === 'production') return '/api';
    return API_URL ? ensureApiBase(API_URL) : '/api';
  }

  // Server/SSR (admin-dashboard is mostly client, but keep deterministic behavior)
  return API_URL ? ensureApiBase(API_URL) : 'http://localhost:8001/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Read a cookie value by name
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Fetch CSRF token once before first mutating request
let csrfFetched = false;
async function ensureCsrfToken(): Promise<string | null> {
  let token = getCookie('csrf-token');
  if (token) return token;
  if (csrfFetched) return null;
  try {
    csrfFetched = true;
    const res = await api.get('/csrf-token');
    token = res.data?.csrfToken || getCookie('csrf-token');
    return token;
  } catch {
    return null;
  }
}

// Request interceptor to add auth token and CSRF token
api.interceptors.request.use(
  async (config) => {
    // Let browser set correct Content-Type + boundary for FormData uploads
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const token = localStorage.getItem('admin-auth-storage');
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // CSRF token for state-changing requests
    if (typeof window !== 'undefined') {
      const method = (config.method || '').toUpperCase();
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const csrfToken = getCookie('csrf-token') || await ensureCsrfToken();
        if (csrfToken) {
          config.headers['x-csrf-token'] = csrfToken;
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const url = String(error.config?.url || '');
        const pathname = window.location?.pathname || '';
        const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/2fa/verify');
        if (pathname !== '/login' && !isAuthRequest) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

