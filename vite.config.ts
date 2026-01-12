
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Esto permite que el código cliente acceda a process.env.API_KEY
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
