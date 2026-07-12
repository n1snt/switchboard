// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Health } from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query';
import { ThemeProvider } from '@/lib/theme';
import { routeTree } from './routeTree.gen';

// A router-level test that mounts the whole shell and route tree the way
// main.tsx does, so every route component, the header, the sidebar, and the
// contextual tabs are exercised through real navigation.

function renderApp(
  initialPath: string,
): ReturnType<typeof createRouter<typeof routeTree>> {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const router = createRouter({ routeTree, history });
  const client = createQueryClient();
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  const body: Health = { status: 'ok', engine: 'connected', version: '0.0.0' };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('application shell', () => {
  it('renders the product name and the engine indicator in the header', async () => {
    renderApp('/phone');
    expect(await screen.findByText('engine ok')).toBeInTheDocument();
    expect(screen.getByText('Switchboard')).toBeInTheDocument();
  });

  it('renders all seven sidebar destinations', async () => {
    renderApp('/phone');
    const sidebar = await screen.findByRole('navigation', { name: 'Primary' });
    for (const label of [
      'Phone',
      'Trunks',
      'Numbers',
      'Routes',
      'Call log',
      'Faults',
      'Settings',
    ]) {
      expect(
        within(sidebar).getByRole('link', { name: label }),
      ).toBeInTheDocument();
    }
  });

  it('redirects the root path to the phone screen', async () => {
    const router = renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Phone' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/phone');
  });

  it('navigates to another destination when a sidebar link is clicked', async () => {
    const user = userEvent.setup();
    renderApp('/phone');
    const sidebar = await screen.findByRole('navigation', { name: 'Primary' });
    await user.click(within(sidebar).getByRole('link', { name: 'Trunks' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Trunks' }),
    ).toBeInTheDocument();
  });

  it('collapses and expands the sidebar', async () => {
    const user = userEvent.setup();
    renderApp('/phone');
    const sidebar = await screen.findByRole('navigation', { name: 'Primary' });
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });

  it('shows the contextual tab strip inside the Trunks section', async () => {
    renderApp('/trunks');
    const section = await screen.findByRole('navigation', { name: 'Section' });
    expect(
      within(section).getByRole('link', { name: 'List' }),
    ).toBeInTheDocument();
  });
});

describe('every destination renders its empty screen', () => {
  it.each([
    ['/phone', 'Phone'],
    ['/trunks', 'Trunks'],
    ['/trunks/new', 'New trunk'],
    ['/trunks/trunk_1', 'Edit trunk'],
    ['/numbers', 'Numbers'],
    ['/numbers/new', 'New number'],
    ['/numbers/number_1', 'Edit number'],
    ['/routes', 'Routes'],
    ['/calls', 'Call log'],
    ['/calls/call_1', 'Call detail'],
    ['/settings', 'Settings'],
    ['/faults', 'Fault profiles'],
  ])('%s shows the "%s" heading', async (path, heading) => {
    renderApp(path);
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument();
  });
});
