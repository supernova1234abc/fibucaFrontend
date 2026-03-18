import axios from 'axios';

// Determine backend URL with fallback for network issues
const getBackendURL = () => {
  if (typeof window === 'undefined') {
    return (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  // Use localhost for dev
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }

  // Use production env variable if set
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/$/, ''); // remove trailing slash
  }

  // Fallback: same origin
  console.warn('[api] VITE_BACKEND_URL not set — defaulting to same origin:', window.location.origin);
  return window.location.origin;
};

export const api = axios.create({
  baseURL: getBackendURL(),
  withCredentials: true,
  timeout: 120000, // 120 seconds for file uploads (increased for mobile)
});

// In-memory token (optional, used if set manually)
let currentToken = null;

export const setAuthToken = (token) => {
  currentToken = token;
};

// Attach token from memory if present
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers['X-Requested-With'] = 'XMLHttpRequest';

  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

// Global response handler: on 401, clear token and let AuthContext handle logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      currentToken = null; // clear in-memory token
      localStorage.removeItem('fibuca_token'); // ✅ Also clear stored token
      localStorage.removeItem('fibuca_user');
      sessionStorage.removeItem('fibuca_token');
      sessionStorage.removeItem('fibuca_user');

      // Optional: emit a custom event for AuthContext to listen to
      document.dispatchEvent(new CustomEvent('fibuca-unauthorized'));

      // Don't force a redirect here — let your app handle it
    }
    // ✅ Better error logging for mobile network issues
    if (err.code === 'ECONNABORTED' || err.message === 'Network Error' || (typeof window !== 'undefined' && !window.navigator.onLine)) {
      console.error('❌ Network issue detected:', err.message);
    }
    return Promise.reject(err);
  }
);
