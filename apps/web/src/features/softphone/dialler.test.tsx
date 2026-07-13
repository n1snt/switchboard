// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NUMBER_EXAMPLE, TRUNK_EXAMPLE } from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';

const trunksHook = vi.hoisted(() => ({ useTrunks: vi.fn() }));
const numbersHook = vi.hoisted(() => ({ useNumbers: vi.fn() }));
vi.mock('@/features/trunks/hooks', () => trunksHook);
vi.mock('@/features/numbers/hooks', () => numbersHook);

import { Dialler } from './dialler';

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  trunksHook.useTrunks.mockReturnValue({ data: [TRUNK_EXAMPLE] });
  numbersHook.useNumbers.mockReturnValue({ data: [NUMBER_EXAMPLE] });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Dialler', () => {
  it('lists dialable trunks and numbers in the picker', () => {
    render(<Dialler />);
    expect(
      screen.getByRole('option', { name: 'agent-dev' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Main line (+14155550123)' }),
    ).toBeInTheDocument();
  });

  it('disables Call until there is a target, then places the call', async () => {
    const user = userEvent.setup();
    render(<Dialler />);
    const callButton = screen.getByRole('button', { name: 'Call' });
    expect(callButton).toBeDisabled();

    await user.type(screen.getByLabelText('Number or SIP URI'), '+14155550123');
    expect(callButton).toBeEnabled();
    await user.click(callButton);

    expect(useSoftphoneStore.getState().callState).toBe('calling');
    expect(useSoftphoneStore.getState().activeCall).toEqual({
      peer: '+14155550123',
      direction: 'placed',
    });
  });

  it('fills the target from the picker and appends keypad digits', async () => {
    const user = userEvent.setup();
    render(<Dialler />);
    await user.selectOptions(screen.getByLabelText('Destination'), 'agent-dev');
    const input = screen.getByLabelText('Number or SIP URI');
    expect(input).toHaveValue('agent-dev');
    await user.click(screen.getByRole('button', { name: 'Key 1' }));
    expect(input).toHaveValue('agent-dev1');
  });

  it('omits a group with no destinations', () => {
    numbersHook.useNumbers.mockReturnValue({ data: [] });
    render(<Dialler />);
    expect(
      screen.getByRole('option', { name: 'agent-dev' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Main line (+14155550123)' }),
    ).not.toBeInTheDocument();
  });

  it('renders with no destinations while the lists are loading', () => {
    trunksHook.useTrunks.mockReturnValue({ isPending: true });
    numbersHook.useNumbers.mockReturnValue({ isPending: true });
    render(<Dialler />);
    expect(
      screen.queryByRole('option', { name: 'agent-dev' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Call' })).toBeDisabled();
  });

  it('fills the target from a recent destination', async () => {
    useSoftphoneStore.setState({ recents: ['carrier-sim'] });
    const user = userEvent.setup();
    render(<Dialler />);
    await user.click(screen.getByRole('button', { name: 'carrier-sim' }));
    expect(screen.getByLabelText('Number or SIP URI')).toHaveValue(
      'carrier-sim',
    );
  });
});
