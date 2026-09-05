import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listens on all local IPs (needed for mobile/tunnel access)
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/media': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true
      }
    }
  }
});