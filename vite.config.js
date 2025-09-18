//fibuca-frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({

  server: {
    host: true, // 👈 allows access from LAN or public IP
    allowedHosts: true, // 👈 allows any hostname (including Ngrok URLs)
  },

    plugins: [react()],
    base:"/",
})
