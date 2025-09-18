// fibuca-frontend/src/lib/api.js
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
});

// This lets AuthContext set or update the token dynamically
let currentToken = null;

export const setAuthToken = (token) => {
  currentToken = token;
};

// Attach token from AuthContext if present
api.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

// Global response handler: on 401 clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      currentToken = null; // clear token in memory
      try {
        window.location.href = '/login';
      } catch (e) {}
    }
    return Promise.reject(err);
  }
);
