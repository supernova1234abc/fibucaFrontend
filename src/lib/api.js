import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
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

      // Optional: emit a custom event for AuthContext to listen to
      document.dispatchEvent(new CustomEvent('fibuca-unauthorized'));

      // Don't force a redirect here — let your app handle it
    }
    return Promise.reject(err);
  }
);
