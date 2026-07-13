// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

// Application bootstrap and composition root: it wires the TanStack Router, the
// TanStack Query client, and the theme provider, then mounts the app. Excluded
// from coverage (see the root vitest config): its parts are unit-tested
// individually and it is exercised by running the app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { createQueryClient } from '@/lib/query';
import { ThemeProvider } from '@/lib/theme';
import { resolveSoftphoneConfig } from '@/features/softphone/config';
import { attachSoftphoneSession } from '@/features/softphone/session';
import { SipjsAdapter } from '@/features/softphone/sipjsAdapter';
import { useSoftphoneStore } from '@/stores/softphone';
import '@/styles/index.css';

// Wire the browser softphone to the engine: register over the SIP WebSocket and
// route the session's lifecycle into the softphone store. The remote-audio
// element lives outside React (created here at bootstrap) because SimpleUser
// binds it at construction, before the first render. The SIP session is the
// browser/WebRTC seam, excluded from coverage along with this bootstrap.
function connectSoftphone(): void {
  const config = resolveSoftphoneConfig(window.location, import.meta.env);
  const remoteAudio = document.createElement('audio');
  remoteAudio.autoplay = true;
  document.body.appendChild(remoteAudio);
  const adapter = new SipjsAdapter({ ...config, remoteAudio });
  attachSoftphoneSession(adapter, useSoftphoneStore.getState());
}

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const queryClient = createQueryClient();

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
  connectSoftphone();
}
