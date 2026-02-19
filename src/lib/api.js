import axios from 'axios';

// Determine backend URL with fallback for network issues
const getBackendURL = () => {
  const productionURL = import.meta.env.VITE_BACKEND_URL;
  // If on localhost, use local backend for development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  return productionURL;
};

export const api = axios.create({
  baseURL: getBackendURL(),
  withCredentials: true,
  timeout: 90000, // 90 seconds for file uploads
});

// In-memory token (optional, used if set manually)
let currentToken = null;

export const setAuthToken = (token) => {
  currentToken = token;
};

// Attach token from memory if present
api.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers = config.headers || {};
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

      // Optional: emit a custom event for AuthContext to listen to
      document.dispatchEvent(new CustomEvent('fibuca-unauthorized'));

      // Don't force a redirect here — let your app handle it
    }
    // ✅ Better error logging for mobile network issues
    if (err.code === 'ECONNABORTED' || err.message === 'Network Error' || !window.navigator.onLine) {
      console.error('❌ Network issue detected:', err.message);
    }
    return Promise.reject(err);
  }
);
