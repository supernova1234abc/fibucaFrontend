//fibuca-frontend/src/lib/api.js
import axios from 'axios';
import { navigate } from 'react-router-dom';

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
});

// Attach token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fibuca_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global response handler: on 401 clear auth and redirect to login
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('fibuca_user')
      localStorage.removeItem('fibuca_token')
      try {
        // best-effort redirect
        window.location.href = '/login'
      } catch (e) {}
    }
    return Promise.reject(err)
  }
)
