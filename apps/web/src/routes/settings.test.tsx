// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  SETTINGS_EXAMPLE,
  TRUNK_EXAMPLE,
  type Trunk,
} from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';
import { renderAppAt, stubHealth } from '@/test/harness';

const S = vi.hoisted(() => ({
  useSettings: vi.fn(),
  useUpdateSettings: vi.fn(),
}));
vi.mock('@/features/settings/hooks', () => S);

const T = vi.hoisted(() => ({ useTrunks: vi.fn() }));
vi.mock('@/features/trunks/hooks', () => T);

const updateMutate = vi.fn();
const envTrunk: Trunk = {
  ...TRUNK_EXAMPLE,
  id: 't_env',
  name: 'carrier',
  source: 'env',
};

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  stubHealth();
  S.useSettings.mockReturnValue({
    isPending: false,
    isError: false,
    data: SETTINGS_EXAMPLE,
  });
  S.useUpdateSettings.mockReturnValue({ mutate: updateMutate });
  T.useTrunks.mockReturnValue({
    isPending: false,
    isError: false,
    data: [TRUNK_EXAMPLE, envTrunk],
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('settings recording tab', () => {
  it('shows a loading state', async () => {
    S.useSettings.mockReturnValue({ isPending: true, isError: false });
    renderAppAt('/settings');
    expect(await screen.findByText('Loading settings…')).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    S.useSettings.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('bad'),
    });
    renderAppAt('/settings');
    expect(await screen.findByText('bad')).toBeInTheDocument();
  });

  it('toggles record-all through the settings mutation', async () => {
    const user = userEvent.setup();
    renderAppAt('/settings');
    await user.click(
      await screen.findByRole('switch', { name: 'Record all calls' }),
    );
    expect(updateMutate).toHaveBeenCalledWith({ record_all_calls: true });
  });
});

describe('settings engine tab', () => {
  it('shows the engine status and version', async () => {
    const user = userEvent.setup();
    renderAppAt('/settings');
    await user.click(await screen.findByRole('tab', { name: 'Engine' }));
    expect(await screen.findByText('connected')).toBeInTheDocument();
    expect(screen.getByText('0.0.0')).toBeInTheDocument();
  });

  it('shows a checking state while health is pending', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    const user = userEvent.setup();
    renderAppAt('/settings');
    await user.click(await screen.findByRole('tab', { name: 'Engine' }));
    expect(await screen.findByText('Checking engine…')).toBeInTheDocument();
  });

  it('shows an unreachable state on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const user = userEvent.setup();
    renderAppAt('/settings');
    await user.click(await screen.findByRole('tab', { name: 'Engine' }));
    expect(
      await screen.findByText('Cannot reach the control plane.'),
    ).toBeInTheDocument();
  });

  it('flags a disconnected engine', async () => {
    stubHealth('disconnected');
    const user = userEvent.setup();
    renderAppAt('/settings');
    await user.click(await screen.findByRole('tab', { name: 'Engine' }));
    expect(await screen.findByText('disconnected')).toBeInTheDocument();
  });
});

describe('settings environment tab', () => {
  it('lists env-managed trunks', async () => {
    const user = userEvent.setup();
    renderAppAt('/settings');
    await user.click(await screen.findByRole('tab', { name: 'Environment' }));
    expect(await screen.findByText('carrier')).toBeInTheDocument();
  });

  it('shows the empty state when trunks are unavailable', async () => {
    T.useTrunks.mockReturnValue({ isPending: true, isError: false });
    const user = userEvent.setup();
    renderAppAt('/settings');
    await user.click(await screen.findByRole('tab', { name: 'Environment' }));
    expect(
      await screen.findByText('No environment-managed items.'),
    ).toBeInTheDocument();
  });
});

describe('settings credentials tab', () => {
  it('shows a copyable per-trunk overview', async () => {
    const user = userEvent.setup();
    renderAppAt('/settings');
    await user.click(await screen.findByRole('tab', { name: 'Credentials' }));
    expect(
      await screen.findByRole('heading', { level: 3, name: 'agent-dev' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('host.docker.internal:5060').length,
    ).toBeGreaterThan(0);
  });

  it('shows the empty state with no trunks', async () => {
    T.useTrunks.mockReturnValue({ isPending: true, isError: false });
    const user = userEvent.setup();
    renderAppAt('/settings');
    await user.click(await screen.findByRole('tab', { name: 'Credentials' }));
    expect(
      await screen.findByText('No trunks configured yet.'),
    ).toBeInTheDocument();
  });
});
