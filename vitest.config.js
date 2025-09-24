import { defineConfig } from 'vitest/config';

export default defineConfig({
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
        'config/',
        '*.config.js',
        'src/debug/*.js', // Exclude debug tools from coverage
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    // Mock browser APIs
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true // Better for debugging
      }
    }
  }
});