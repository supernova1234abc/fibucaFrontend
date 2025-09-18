//fibuca-frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
 
  plugins: [react()],
  base:'/',
  server: {
    host: true,
    allowedHosts: 'all'
  },
  build:{
    outDir:"dist"
  }
});
