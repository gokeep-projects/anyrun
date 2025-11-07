import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/apps': 'http://localhost:8081',
      '/api/start': 'http://localhost:8081',
      '/api/stop': 'http://localhost:8081',
      '/api/config': 'http://localhost:8081',
      '/api/config/save': 'http://localhost:8081',
      '/api/apps/startall': 'http://localhost:8081',
      '/api/apps/stopall': 'http://localhost:8081',
      '/api/apps/restartall': 'http://localhost:8081',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});