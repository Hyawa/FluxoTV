import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // O teste de integracao dispara um `vite build` completo e por isso demora mais.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
