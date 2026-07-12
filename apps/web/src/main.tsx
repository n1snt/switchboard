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
import '@/styles/index.css';

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
}
