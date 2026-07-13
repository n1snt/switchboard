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
        // Composition roots / bootstrap seams: exercised by running the app,
        // not by unit tests (their parts are unit-tested individually).
        'apps/server/src/server.ts',
        // Thin seam over the real ari-client library, proven against a running
        // engine (the connection logic is tested with an injected connector).
        'apps/server/src/ari/connect.ts',
        // Filesystem tail of Asterisk's PJSIP log on the shared volume, proven
        // against a running engine (the trace capture it feeds is unit-tested).
        'apps/server/src/ari/pjsip-log-source.ts',
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
