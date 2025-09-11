// src/lib/api.js
import axios from "axios";

export const baseURL = import.meta.env.VITE_BACKEND_URL; // ✅ now exported

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
