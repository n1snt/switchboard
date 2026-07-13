// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';
import { renderAppAt, stubHealth } from '@/test/harness';

// A router-level test that mounts the whole shell and route tree the way
// main.tsx does, so the header, sidebar, contextual tabs, and navigation are
// exercised through real navigation. Resource hooks are mocked to empty so the
// screens render without a live control plane.

const trunksHook = vi.hoisted(() => ({
  useTrunks: vi.fn(),
  useDeleteTrunk: vi.fn(),
  useCreateTrunk: vi.fn(),
}));
vi.mock('@/features/trunks/hooks', () => trunksHook);

const numbersHook = vi.hoisted(() => ({ useNumbers: vi.fn() }));
vi.mock('@/features/numbers/hooks', () => numbersHook);

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  stubHealth();
  trunksHook.useTrunks.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
  });
  trunksHook.useDeleteTrunk.mockReturnValue({ mutate: vi.fn() });
  trunksHook.useCreateTrunk.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  numbersHook.useNumbers.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('application shell', () => {
  it('renders the product name and the engine indicator in the header', async () => {
    renderAppAt('/phone');
    expect(await screen.findByText('engine ok')).toBeInTheDocument();
    expect(screen.getByText('Switchboard')).toBeInTheDocument();
  });

  it('renders all seven sidebar destinations', async () => {
    renderAppAt('/phone');
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
    const { router } = renderAppAt('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Place a call' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/phone');
  });

  it('navigates to another destination when a sidebar link is clicked', async () => {
    const user = userEvent.setup();
    renderAppAt('/phone');
    const sidebar = await screen.findByRole('navigation', { name: 'Primary' });
    await user.click(within(sidebar).getByRole('link', { name: 'Trunks' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Trunks' }),
    ).toBeInTheDocument();
  });

  it('collapses and expands the sidebar', async () => {
    const user = userEvent.setup();
    renderAppAt('/phone');
    const sidebar = await screen.findByRole('navigation', { name: 'Primary' });
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });

  it('shows the contextual tab strip inside the Trunks section', async () => {
    renderAppAt('/trunks');
    const section = await screen.findByRole('navigation', { name: 'Section' });
    expect(
      within(section).getByRole('link', { name: 'List' }),
    ).toBeInTheDocument();
  });
});
