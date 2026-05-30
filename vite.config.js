import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    // Forces Vite to discover and translate these older packages into ES Modules
    include: ['react-simple-maps', 'prop-types'],
  },
});