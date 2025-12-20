import axios from 'axios';

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

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error details for debugging
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      console.error('API Error Request:', {
        message: error.message,
        request: error.request,
      });
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
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
