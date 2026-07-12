import { defineConfig } from 'vitest/config';

// Root Vitest configuration. It composes every package's own config as a
// project (so each picks its own environment: node for the server and shared,
// jsdom for the web app) and enforces the 100% coverage thresholds from
// CLAUDE.md across the aggregated result.
export default defineConfig({
  test: {
    projects: [
      'packages/shared/vitest.config.ts',
      'packages/cli/vitest.config.ts',
      'apps/server/vitest.config.ts',
      'apps/web/vitest.config.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Only first-party source is measured; generated files, bootstrap
      // entrypoints, and tests are not.
      include: [
        'packages/shared/src/**/*.{ts,tsx}',
        'packages/cli/src/**/*.{ts,tsx}',
        'apps/server/src/**/*.{ts,tsx}',
        'apps/web/src/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        'apps/web/src/main.tsx',
        'apps/web/src/routeTree.gen.ts',
        'apps/web/src/**/*.gen.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
