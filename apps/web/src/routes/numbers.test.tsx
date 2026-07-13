// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NUMBER_EXAMPLE, TRUNK_EXAMPLE } from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';
import { renderAppAt, stubHealth } from '@/test/harness';

const N = vi.hoisted(() => ({
  useNumbers: vi.fn(),
  useNumber: vi.fn(),
  useCreateNumber: vi.fn(),
  useUpdateNumber: vi.fn(),
  useDeleteNumber: vi.fn(),
}));
vi.mock('@/features/numbers/hooks', () => N);

const T = vi.hoisted(() => ({ useTrunks: vi.fn() }));
vi.mock('@/features/trunks/hooks', () => T);

const createMutate = vi.fn();
const updateMutate = vi.fn();
const deleteMutate = vi.fn();

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  stubHealth();
  N.useNumbers.mockReturnValue({ isPending: false, isError: false, data: [] });
  N.useNumber.mockReturnValue({
    isPending: false,
    isError: false,
    data: NUMBER_EXAMPLE,
  });
  N.useCreateNumber.mockReturnValue({ mutate: createMutate, isPending: false });
  N.useUpdateNumber.mockReturnValue({ mutate: updateMutate, isPending: false });
  N.useDeleteNumber.mockReturnValue({ mutate: deleteMutate });
  T.useTrunks.mockReturnValue({
    isPending: false,
    isError: false,
    data: [TRUNK_EXAMPLE],
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('numbers list', () => {
  it('shows a loading state', async () => {
    N.useNumbers.mockReturnValue({ isPending: true, isError: false });
    renderAppAt('/numbers');
    expect(await screen.findByText('Loading numbers…')).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    N.useNumbers.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('nope'),
    });
    renderAppAt('/numbers');
    expect(await screen.findByText('nope')).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    renderAppAt('/numbers');
    expect(await screen.findByText(/No numbers yet/)).toBeInTheDocument();
  });

  it('lists numbers, resolves trunk names, and deletes on confirm', async () => {
    N.useNumbers.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        NUMBER_EXAMPLE,
        { id: 'n2', e164: '+14155559999', trunk_id: 'unknown' },
      ],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderAppAt('/numbers');

    expect(
      await screen.findByRole('link', { name: '+14155550123' }),
    ).toBeInTheDocument();
    // Resolved name for the known trunk, id fallback for the unknown one.
    expect(screen.getByRole('cell', { name: 'agent-dev' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'unknown' })).toBeInTheDocument();
    // Label present for one, dash for the other.
    expect(screen.getByRole('cell', { name: 'Main line' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '—' })).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Delete +14155550123' }),
    );
    expect(deleteMutate).toHaveBeenCalledWith('num_MTQxNTU');
  });

  it('falls back to the trunk id while trunks are still loading', async () => {
    N.useNumbers.mockReturnValue({
      isPending: false,
      isError: false,
      data: [NUMBER_EXAMPLE],
    });
    T.useTrunks.mockReturnValue({ isPending: true, isError: false });
    renderAppAt('/numbers');
    expect(
      await screen.findByRole('cell', { name: 'trunk_Zm9vYmFy' }),
    ).toBeInTheDocument();
  });

  it('lets a form be cancelled back to the list', async () => {
    const user = userEvent.setup();
    const { router } = renderAppAt('/numbers/new');
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/numbers');
    });
  });

  it('shows a create error even while trunks are loading', async () => {
    N.useCreateNumber.mockReturnValue({
      mutate: createMutate,
      isPending: false,
      error: new Error('duplicate number'),
    });
    T.useTrunks.mockReturnValue({ isPending: true, isError: false });
    renderAppAt('/numbers/new');
    expect(await screen.findByText('duplicate number')).toBeInTheDocument();
  });
});

describe('new number', () => {
  it('creates a number and returns to the list', async () => {
    createMutate.mockImplementation(
      (_input: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess();
      },
    );
    const user = userEvent.setup();
    const { router } = renderAppAt('/numbers/new');

    await user.type(
      await screen.findByLabelText('Phone number (E.164)'),
      '+14155550123',
    );
    await user.selectOptions(
      screen.getByLabelText('Inbound trunk'),
      'trunk_Zm9vYmFy',
    );
    await user.click(screen.getByRole('button', { name: 'Save number' }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/numbers');
    });
  });
});

describe('edit number', () => {
  it('shows a loading state', async () => {
    N.useNumber.mockReturnValue({ isPending: true, isError: false });
    renderAppAt('/numbers/num_1');
    expect(await screen.findByText('Loading number…')).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    N.useNumber.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('gone'),
    });
    renderAppAt('/numbers/num_1');
    expect(await screen.findByText('gone')).toBeInTheDocument();
  });

  it('prefills and saves changes', async () => {
    updateMutate.mockImplementation(
      (_input: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess();
      },
    );
    const user = userEvent.setup();
    const { router } = renderAppAt('/numbers/num_MTQxNTU');
    expect(await screen.findByDisplayValue('+14155550123')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(updateMutate).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/numbers');
    });
  });

  it('cancels back to the list', async () => {
    const user = userEvent.setup();
    const { router } = renderAppAt('/numbers/num_MTQxNTU');
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/numbers');
    });
  });

  it('shows an update error even while trunks are loading', async () => {
    N.useUpdateNumber.mockReturnValue({
      mutate: updateMutate,
      isPending: false,
      error: new Error('update rejected'),
    });
    T.useTrunks.mockReturnValue({ isPending: true, isError: false });
    renderAppAt('/numbers/num_MTQxNTU');
    expect(await screen.findByText('update rejected')).toBeInTheDocument();
  });
});
