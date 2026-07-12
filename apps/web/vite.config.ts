import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

// The web app is a static build with no server of its own. In development the
// dev server proxies the control-plane API and the event WebSocket to
// switchboard-api, mirroring what the nginx image does in production, so the
// browser always talks to a single origin with relative /api/v1 URLs.
//
// The TanStack Router plugin generates src/routeTree.gen.ts from the file-based
// routes under src/routes; it runs first so React sees the generated tree.
const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1/events': { target: API_TARGET, ws: true, changeOrigin: true },
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
});
