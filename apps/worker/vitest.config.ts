import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'worker',
    environment: 'node',
    globals: true,
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
  resolve: {
    alias: {
      '@dam/database': resolve(__dirname, '../../packages/database/src/index.ts'),
      '@dam/types': resolve(__dirname, '../../packages/types/src/index.ts'),
      '@dam/queue': resolve(__dirname, '../../packages/queue/src/index.ts'),
    },
  },
});
