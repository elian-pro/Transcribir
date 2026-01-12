import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Inyectamos la API_KEY que viene del entorno de construcción (Docker/EasyPanel)
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
