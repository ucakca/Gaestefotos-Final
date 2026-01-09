import axios from 'axios';
import { qaLog } from './qaLog';

// Dynamically determine API URL based on current environment
function getApiUrl(): string {
  const ensureApiPrefix = (base: string): string => {
    const trimmed = base.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  };

  // If running in browser, use current origin for API
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const port = window.location.port;

    // Local dev: during dev/E2E we may run Next on various ports (3000/3001/3002/...)
    // In that case we want to talk directly to the backend (8001) unless overridden.
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    const isDev = process.env.NODE_ENV !== 'production';

    if (isLocalHost && isDev) {
      const envApi = process.env.NEXT_PUBLIC_API_URL;
      // In local dev we often want to force the local backend even if NEXT_PUBLIC_API_URL
      // is set to production (to avoid CORS + hitting real data).
      const isEnvLocalhost =
        typeof envApi === 'string' &&
        (envApi.includes('localhost') || envApi.includes('127.0.0.1'));

      return ensureApiPrefix(isEnvLocalhost ? envApi! : 'http://localhost:8001');
    }

    // Production (and browser preview proxies): use relative path so cookies/CORS work.
    return '/api';
  }
  
  // Fallback to environment variable or default
  return ensureApiPrefix(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001');
}

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS with credentials
  timeout: 30000, // 30 second timeout
});

export function buildApiUrl(path: string): string {
  const base = (api.defaults.baseURL || '').replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!base) return normalizedPath;
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}${normalizedPath}`;
  }
  return `${base}${normalizedPath}`;
}

export function formatApiError(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error;
  }

  if (Array.isArray(data?.error) && data.error.length > 0) {
    return data.error.map((e: any) => e?.message || String(e)).join(', ');
  }

  if (status === 413) return 'Datei zu groß.';
  if (status === 429) return 'Zu viele Uploads – bitte kurz warten und erneut versuchen.';
  if (status === 401) return 'Nicht eingeloggt (bitte neu laden).';
  if (status === 403) return 'Upload nicht erlaubt (Event/Album gesperrt oder Zeitraum abgelaufen).';
  if (status === 404) return 'Event nicht gefunden.';

  const msg = err?.message;
  if (typeof msg === 'string' && msg.trim()) {
    if (msg.toLowerCase().includes('timeout')) {
      return 'Timeout beim Upload – bitte erneut versuchen.';
    }
    return msg;
  }

  return 'Unbekannter Fehler';
}

export function isRetryableUploadError(err: any): boolean {
  const status = err?.response?.status;
  if (status && typeof status === 'number') {
    return status >= 500 || status === 408 || status === 429;
  }
  return !!err?.request;
}

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const status = error?.response?.status;
      const url = error?.config?.url;
      const method = error?.config?.method;
      const message = error?.message;
      const isAuthRelated = typeof url === 'string' && (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/logout'));

      // Keep noise low: log only meaningful API failures.
      if (!isAuthRelated && (status >= 500 || status === 401 || status === 403 || status === 429)) {
        qaLog({
          level: 'IMPORTANT',
          type: 'api_error',
          message: typeof message === 'string' ? message : 'API error',
          data: {
            status,
            url,
            method,
            response: error?.response?.data,
          },
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          method: typeof method === 'string' ? method.toUpperCase() : undefined,
        }).catch(() => null);
      }
    } catch {
      // ignore logging errors
    }
    return Promise.reject(error);
  }
);

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData, let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
  }
  return config;
});

export default api;
