import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs on :5000 and Vite proxies /api to it
// (including the admin's live block stream, which is Server-Sent Events).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
});
