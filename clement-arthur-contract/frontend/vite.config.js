import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${process.env.API_PORT ?? 3000}`,
    },
  },
});
