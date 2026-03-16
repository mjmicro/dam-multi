import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/api/vitest.config.ts',
      'apps/worker/vitest.config.ts',
      'packages/database/vitest.config.ts',
      'packages/types/vitest.config.ts',
      'packages/queue/vitest.config.ts',
    ],
  },
});
