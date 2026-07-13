// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROUTE_EXAMPLE } from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';
import { renderAppAt, stubHealth } from '@/test/harness';

const R = vi.hoisted(() => ({
  useRoutes: vi.fn(),
  useRoute: vi.fn(),
  useCreateRoute: vi.fn(),
  useUpdateRoute: vi.fn(),
  useDeleteRoute: vi.fn(),
}));
vi.mock('@/features/routes/hooks', () => R);

const createMutate = vi.fn();
const updateMutate = vi.fn();
const deleteMutate = vi.fn();

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  stubHealth();
  R.useRoutes.mockReturnValue({ isPending: false, isError: false, data: [] });
  R.useCreateRoute.mockReturnValue({
    mutate: createMutate,
    isPending: false,
    error: null,
  });
  R.useUpdateRoute.mockReturnValue({
    mutate: updateMutate,
    isPending: false,
    error: null,
  });
  R.useDeleteRoute.mockReturnValue({ mutate: deleteMutate });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('routes screen', () => {
  it('shows a loading state', async () => {
    R.useRoutes.mockReturnValue({ isPending: true, isError: false });
    renderAppAt('/routes');
    expect(await screen.findByText('Loading routes…')).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    R.useRoutes.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('boom'),
    });
    renderAppAt('/routes');
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    renderAppAt('/routes');
    expect(
      await screen.findByText('No routing rules yet.'),
    ).toBeInTheDocument();
  });

  it('creates a new rule through the inline editor', async () => {
    createMutate.mockImplementation(
      (_input: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess();
      },
    );
    const user = userEvent.setup();
    renderAppAt('/routes');

    await user.click(await screen.findByRole('button', { name: 'New rule' }));
    await user.type(screen.getByLabelText('Match pattern'), '+1*');
    await user.type(screen.getByLabelText('Destination'), 'softphone');
    await user.click(screen.getByRole('button', { name: 'Create rule' }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    // Editor closes on success.
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Create rule' }),
      ).not.toBeInTheDocument();
    });
  });

  it('surfaces a create error in the editor', async () => {
    R.useCreateRoute.mockReturnValue({
      mutate: createMutate,
      isPending: false,
      error: new Error('duplicate rule'),
    });
    const user = userEvent.setup();
    renderAppAt('/routes');
    await user.click(await screen.findByRole('button', { name: 'New rule' }));
    expect(screen.getByText('duplicate rule')).toBeInTheDocument();
  });

  it('edits an existing rule and deletes on confirm', async () => {
    R.useRoutes.mockReturnValue({
      isPending: false,
      isError: false,
      data: [ROUTE_EXAMPLE],
    });
    updateMutate.mockImplementation(
      (_input: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess();
      },
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderAppAt('/routes');

    await user.click(
      await screen.findByRole('button', { name: 'Edit rule +1415*' }),
    );
    expect(screen.getByDisplayValue('+1415*')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save rule' }));
    expect(updateMutate).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole('button', { name: 'Delete rule +1415*' }),
    );
    expect(deleteMutate).toHaveBeenCalledWith('route_ZGVmYXVsdA');
  });
});
