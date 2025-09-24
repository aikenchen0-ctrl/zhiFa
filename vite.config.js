import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: '/',
  
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src'),
      '@/components': resolve(process.cwd(), 'src/components'),
      '@/core': resolve(process.cwd(), 'src/core'),
      '@/utils': resolve(process.cwd(), 'src/utils')
    }
  },
  
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html')
      }
    }
  },
  
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: false,
    open: false
  },
  
  optimizeDeps: {
    include: ['pixi.js']
  },
  
  esbuild: {
    target: 'esnext'
  }
});