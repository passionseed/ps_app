import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/pathlab.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});
