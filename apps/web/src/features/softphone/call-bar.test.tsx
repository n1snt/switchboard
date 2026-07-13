// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderInRouter } from '@/test/harness';
import { nullSipAdapter, type SipAdapter } from './adapter';
import { CallBar } from './call-bar';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';

let adapter: SipAdapter;
beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  adapter = {
    ...nullSipAdapter,
    mute: vi.fn(),
    hold: vi.fn(),
    hangup: vi.fn(),
  };
  useSoftphoneStore.getState().attachAdapter(adapter);
});

describe('CallBar', () => {
  it('renders nothing while idle', () => {
    const { container } = renderInRouter(<CallBar />);
    expect(container.querySelector('[aria-label="Active call"]')).toBeNull();
  });

  it('mirrors the party and controls during a call and ends it', async () => {
    useSoftphoneStore.setState({
      callState: 'in-call',
      activeCall: { peer: 'agent-dev', direction: 'placed' },
      answeredAt: Date.now(),
    });
    const user = userEvent.setup();
    renderInRouter(<CallBar />);

    expect(await screen.findByText('agent-dev')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mute' }));
    expect(adapter.mute).toHaveBeenCalledWith(true);
    await user.click(screen.getByRole('button', { name: 'Hold' }));
    expect(adapter.hold).toHaveBeenCalledWith(true);
    await user.click(screen.getByRole('button', { name: 'End call' }));
    expect(adapter.hangup).toHaveBeenCalledTimes(1);
    expect(useSoftphoneStore.getState().callState).toBe('idle');
  });

  it('shows without a timer while dialling', async () => {
    useSoftphoneStore.setState({
      callState: 'calling',
      activeCall: { peer: 'carrier', direction: 'placed' },
    });
    renderInRouter(<CallBar />);
    expect(await screen.findByText('carrier')).toBeInTheDocument();
  });
});
