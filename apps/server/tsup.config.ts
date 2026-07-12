import { defineConfig } from 'tsup';

// Production build for the switchboard-api image: bundle the server and the
// workspace `@switchboard/shared` package into a single ESM file. Native and
// CJS-only dependencies (better-sqlite3, ari-client) stay external and are
// installed as production dependencies in the runtime stage.
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@switchboard\/shared/],
});
