import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    hookTimeout: 30000,
    testTimeout: 30000,
    fileParallelism: false,
    pool: 'forks',
  },
});
