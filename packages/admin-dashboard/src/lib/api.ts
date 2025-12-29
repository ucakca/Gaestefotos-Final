import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser: same-origin in production; allow explicit override for local dev/E2E.
    return API_URL ? `${API_URL}/api` : '/api';
  }

  // Server/SSR (admin-dashboard is mostly client, but keep deterministic behavior)
  return API_URL ? `${API_URL}/api` : 'http://localhost:8001/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
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
      // Unauthorized - redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

