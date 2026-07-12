import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The web app is a static build with no server of its own. In development the
// dev server proxies the control-plane API and the event WebSocket to
// switchboard-api, mirroring what the nginx image does in production, so the
// browser always talks to a single origin with relative /api/v1 URLs.
//
// The TanStack Router plugin is added alongside the file-based routes in
// feature 5 (web skeleton).
const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
