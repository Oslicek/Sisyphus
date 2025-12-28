import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/utils/**/*.ts'],
      exclude: ['src/utils/**/*.test.ts'],
      reporter: ['text', 'text-summary'],
    },
  },
});

