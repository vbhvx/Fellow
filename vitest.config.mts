import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/setup/global-setup.ts'],
    // Suites share one database and the outbox relay is global; run files serially for determinism.
    fileParallelism: false,
    env: {
      // Tests register many users from one "IP"; the limiter itself is covered by its own test.
      RATE_LIMIT_DISABLED: 'true',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
