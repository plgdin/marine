import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  envDir: '../',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@config': path.resolve(__dirname, './src/config'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/'))  return 'vendor';
            if (id.includes('react-router'))                         return 'router';
            if (id.includes('@tanstack'))                            return 'query';
            if (id.includes('framer-motion'))                        return 'motion';
            if (id.includes('lucide-react'))                         return 'icons';
          }
          return undefined;
        },
      },
    },
    sourcemap: true,
  },
});
