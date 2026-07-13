// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TRUNK_EXAMPLE, type Trunk } from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';
import { renderAppAt, stubHealth } from '@/test/harness';

const H = vi.hoisted(() => ({
  useTrunks: vi.fn(),
  useTrunk: vi.fn(),
  useCreateTrunk: vi.fn(),
  useUpdateTrunk: vi.fn(),
  useDeleteTrunk: vi.fn(),
}));
vi.mock('@/features/trunks/hooks', () => H);

const createMutate = vi.fn();
const updateMutate = vi.fn();
const deleteMutate = vi.fn();

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  stubHealth();
  H.useTrunks.mockReturnValue({ isPending: false, isError: false, data: [] });
  H.useTrunk.mockReturnValue({
    isPending: false,
    isError: false,
    data: TRUNK_EXAMPLE,
  });
  H.useCreateTrunk.mockReturnValue({ mutate: createMutate, isPending: false });
  H.useUpdateTrunk.mockReturnValue({ mutate: updateMutate, isPending: false });
  H.useDeleteTrunk.mockReturnValue({ mutate: deleteMutate });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('trunks list', () => {
  it('shows a loading state', async () => {
    H.useTrunks.mockReturnValue({ isPending: true, isError: false });
    renderAppAt('/trunks');
    expect(await screen.findByText('Loading trunks…')).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    H.useTrunks.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('boom'),
    });
    renderAppAt('/trunks');
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    renderAppAt('/trunks');
    expect(await screen.findByText(/No trunks yet/)).toBeInTheDocument();
  });

  it('lists trunks with an env badge and disabled status', async () => {
    const env: Trunk = {
      ...TRUNK_EXAMPLE,
      id: 'trunk_env',
      name: 'carrier',
      source: 'env',
      enabled: false,
    };
    H.useTrunks.mockReturnValue({
      isPending: false,
      isError: false,
      data: [TRUNK_EXAMPLE, env],
    });
    renderAppAt('/trunks');
    expect(
      await screen.findByRole('link', { name: 'agent-dev' }),
    ).toBeInTheDocument();
    expect(screen.getByText('env')).toBeInTheDocument();
    expect(screen.getByText('disabled')).toBeInTheDocument();
  });

  it('deletes a trunk after confirmation, and not when cancelled', async () => {
    H.useTrunks.mockReturnValue({
      isPending: false,
      isError: false,
      data: [TRUNK_EXAMPLE],
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderAppAt('/trunks');

    await user.click(
      await screen.findByRole('button', { name: 'Delete agent-dev' }),
    );
    expect(deleteMutate).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Delete agent-dev' }));
    expect(deleteMutate).toHaveBeenCalledWith('trunk_Zm9vYmFy');
  });
});

describe('new trunk', () => {
  it('creates a trunk and returns to the list', async () => {
    createMutate.mockImplementation(
      (_input: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess();
      },
    );
    const user = userEvent.setup();
    const { router } = renderAppAt('/trunks/new');

    await user.type(await screen.findByLabelText('Name'), 'agent-dev');
    await user.type(screen.getByLabelText('Host or IP address'), 'host');
    await user.click(screen.getByRole('button', { name: 'Save trunk' }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/trunks');
    });
  });

  it('cancels back to the list', async () => {
    const user = userEvent.setup();
    const { router } = renderAppAt('/trunks/new');
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/trunks');
    });
  });

  it('shows a create error from the server', async () => {
    H.useCreateTrunk.mockReturnValue({
      mutate: createMutate,
      isPending: false,
      error: new Error('name taken'),
    });
    renderAppAt('/trunks/new');
    expect(await screen.findByText('name taken')).toBeInTheDocument();
  });
});

describe('edit trunk', () => {
  it('shows a loading state', async () => {
    H.useTrunk.mockReturnValue({ isPending: true, isError: false });
    renderAppAt('/trunks/trunk_1');
    expect(await screen.findByText('Loading trunk…')).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    H.useTrunk.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('missing'),
    });
    renderAppAt('/trunks/trunk_1');
    expect(await screen.findByText('missing')).toBeInTheDocument();
  });

  it('prefills the form and saves changes', async () => {
    const user = userEvent.setup();
    const { router } = renderAppAt('/trunks/trunk_Zm9vYmFy');
    updateMutate.mockImplementation(
      (_input: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess();
      },
    );

    expect(await screen.findByDisplayValue('agent-dev')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(updateMutate).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/trunks');
    });
  });

  it('flags an env-managed trunk', async () => {
    H.useTrunk.mockReturnValue({
      isPending: false,
      isError: false,
      data: { ...TRUNK_EXAMPLE, source: 'env' },
    });
    renderAppAt('/trunks/trunk_Zm9vYmFy');
    expect(
      await screen.findByText(/managed by the environment/),
    ).toBeInTheDocument();
  });

  it('cancels back to the list', async () => {
    const user = userEvent.setup();
    const { router } = renderAppAt('/trunks/trunk_Zm9vYmFy');
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/trunks');
    });
  });

  it('shows an update error from the server', async () => {
    H.useUpdateTrunk.mockReturnValue({
      mutate: updateMutate,
      isPending: false,
      error: new Error('update rejected'),
    });
    renderAppAt('/trunks/trunk_Zm9vYmFy');
    expect(await screen.findByText('update rejected')).toBeInTheDocument();
  });
});
