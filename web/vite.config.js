import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/apps': 'http://localhost:8081',
      '/start': 'http://localhost:8081',
      '/stop': 'http://localhost:8081',
      '/config': 'http://localhost:8081',
      '/config/save': 'http://localhost:8081',
    },
  },
});