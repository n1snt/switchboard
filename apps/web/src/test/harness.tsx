// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, type RenderResult } from '@testing-library/react';
import type { EngineStatus } from '@switchboard/shared';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { ThemeProvider } from '@/lib/theme';
import { routeTree } from '@/routeTree.gen';

// Shared test scaffolding. Two render strategies keep the component tests
// robust: `renderAppAt` mounts the real route tree (so file-based routes and
// every <Link> resolve exactly as in production), while `renderInRouter` wraps
// a single component in a minimal router plus the Query and theme providers, for
// leaf components that use <Link> or router hooks without needing the shell.

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

/** Stub `fetch` so the header's health poll resolves in isolation tests. */
export function stubHealth(engine: EngineStatus = 'connected'): void {
  // A fresh Response per call: a Response body can be read only once, and the
  // health query may be fetched by more than one observer.
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ status: 'ok', engine, version: '0.0.0' }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    ),
  );
}

/** Render the whole app (shell + routes) starting at a path. */
export function renderAppAt(path: string): {
  router: ReturnType<typeof createRouter<typeof routeTree, 'never'>>;
} {
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createRouter({ routeTree, history });
  const client = makeQueryClient();
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { router };
}

/** Render a single component inside a minimal router and the app providers. */
export function renderInRouter(ui: ReactNode): RenderResult {
  const rootRoute = createRootRoute({ component: () => ui });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
