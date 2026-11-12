import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: '127.0.0.1',
    port: 5300,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/utils/**/*.ts'],
      exclude: ['node_modules/', '**/*.d.ts', '**/*.test.ts', '**/*.config.*'],
      thresholds: {
        lines: 90,
        branches: 70,
        functions: 90,
        statements: 90,
      },
    },
  },
});
