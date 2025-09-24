import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  root: '.',
  base: './',
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: 'es2020',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('../index.html', import.meta.url)),
        // Add more entry points if needed
      },
      output: {
        manualChunks: {
          'pixi': ['pixi.js'],
          'vendor': ['@pixi/stats', '@pixi/devtools']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: true,
      },
    },
  },

  // Development server configuration
  server: {
    host: '0.0.0.0', // Allow mobile device connections
    port: 3000,
    open: true,
    cors: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },

  // Preview server configuration
  preview: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
  },

  // Module resolution
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
      '@utils': fileURLToPath(new URL('../src/utils', import.meta.url)),
      '@core': fileURLToPath(new URL('../src/core', import.meta.url)),
      '@debug': fileURLToPath(new URL('../src/debug', import.meta.url)),
      '@components': fileURLToPath(new URL('../src/components', import.meta.url)),
      '@tests': fileURLToPath(new URL('../tests', import.meta.url)),
    },
  },

  // Define global constants
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __MOBILE_DEBUG__: JSON.stringify(process.env.MOBILE_DEBUG === 'true'),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },

  // Plugin configuration
  plugins: [
    // Custom plugin for mobile debugging
    {
      name: 'mobile-debug',
      configureServer(server) {
        server.middlewares.use('/mobile-debug', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              console.log('📱 Mobile Debug Data:', JSON.parse(body));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'received' }));
            });
          } else {
            next();
          }
        });
      },
    },
  ],

  // CSS configuration
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },

  // Optimization configuration
  optimizeDeps: {
    include: [
      'pixi.js',
      '@pixi/stats',
      '@pixi/devtools'
    ],
    exclude: [],
  },

  // Test configuration (for Vitest)
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '*.config.js',
      ],
    },
  },

  // ESBuild configuration
  esbuild: {
    target: 'es2020',
    keepNames: true, // Helpful for debugging
  },

  // Worker configuration for potential web workers
  worker: {
    format: 'es',
  },
});