import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV === 'production') return '/api';
    return API_URL ? `${API_URL.replace(/\/+$/, '')}/api` : '/api';
  }
  return API_URL ? `${API_URL.replace(/\/+$/, '')}/api` : 'http://localhost:8001/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor — print terminal uses installer token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('print-terminal-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
