// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TrunkCreate } from '@switchboard/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({
  mutate:
    vi.fn<
      (
        input: TrunkCreate,
        options: { onSuccess: () => void; onError: (error: Error) => void },
      ) => void
    >(),
  isPending: false,
}));

vi.mock('./hooks', () => ({
  useCreateTrunk: () => ({ mutate: hooks.mutate, isPending: hooks.isPending }),
}));

import { QuickAddDialog } from './quick-add-dialog';

afterEach(() => {
  vi.clearAllMocks();
});

async function open(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  render(<QuickAddDialog />);
  await user.click(screen.getByRole('button', { name: 'Quick add' }));
  await screen.findByRole('dialog');
}

describe('QuickAddDialog', () => {
  it('requires a name and address', async () => {
    const user = userEvent.setup();
    await open(user);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      screen.getByText('Name and address are required.'),
    ).toBeInTheDocument();
    expect(hooks.mutate).not.toHaveBeenCalled();
  });

  it('creates a trunk from name and address and closes on success', async () => {
    hooks.mutate.mockImplementation((_input, options) => {
      options.onSuccess();
    });
    const user = userEvent.setup();
    await open(user);
    await user.type(screen.getByLabelText('Name'), 'my-agent');
    await user.type(screen.getByLabelText('Address'), '192.168.1.10:5060');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const input = hooks.mutate.mock.calls[0]?.[0];
    expect(input?.name).toBe('my-agent');
    expect(input?.target_host).toBe('192.168.1.10');
    expect(input?.target_port).toBe(5060);
    expect(input?.auth_mode).toBe('none');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the server error when the create fails', async () => {
    hooks.mutate.mockImplementation((_input, options) => {
      options.onError(new Error('name in use'));
    });
    const user = userEvent.setup();
    await open(user);
    await user.type(screen.getByLabelText('Name'), 'dup');
    await user.type(screen.getByLabelText('Address'), 'host');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('name in use')).toBeInTheDocument();
  });
});
