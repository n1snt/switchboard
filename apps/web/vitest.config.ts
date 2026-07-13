import { defineProject } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineProject({
  // The router plugin runs under Vitest too, so src/routeTree.gen.ts is
  // generated before the route tests import it. autoCodeSplitting is a
  // production bundling optimization (kept on in vite.config.ts); it is turned
  // off here because its lazy-chunk rewrite introduces phantom, uncoverable
  // statements in the sourcemap that would break the 100% coverage gate. It
  // does not affect the generated route tree, so tests behave identically.
  plugins: [
    // Co-located route tests live under src/routes; tell the router plugin to
    // ignore *.test.tsx so they are not mistaken for route files.
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: false,
      routeFileIgnorePattern: '\\.test\\.',
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
