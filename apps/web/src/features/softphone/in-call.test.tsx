// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderInRouter } from '@/test/harness';
import { nullSipAdapter, type SipAdapter } from './adapter';
import { InCall } from './in-call';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';

let adapter: SipAdapter;
beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  adapter = {
    ...nullSipAdapter,
    mute: vi.fn(),
    hold: vi.fn(),
    sendDtmf: vi.fn(),
    hangup: vi.fn(),
  };
  useSoftphoneStore.getState().attachAdapter(adapter);
  useSoftphoneStore.setState({
    callState: 'in-call',
    activeCall: { peer: 'agent-dev', direction: 'received' },
    codec: 'ulaw',
    answeredAt: Date.now(),
  });
});

describe('InCall', () => {
  it('shows the party and negotiated codec', async () => {
    renderInRouter(<InCall />);
    expect(await screen.findByText('agent-dev')).toBeInTheDocument();
    expect(screen.getByLabelText('Call duration').textContent).toContain(
      'PCMU',
    );
  });

  it('drives mute, hold and record toggles through the store', async () => {
    const user = userEvent.setup();
    renderInRouter(<InCall />);

    await user.click(await screen.findByRole('button', { name: 'Mute' }));
    expect(adapter.mute).toHaveBeenCalledWith(true);
    expect(useSoftphoneStore.getState().muted).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Hold' }));
    expect(adapter.hold).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('button', { name: 'Record' }));
    expect(useSoftphoneStore.getState().recording).toBe(true);
  });

  it('opens the keypad and sends DTMF', async () => {
    const user = userEvent.setup();
    renderInRouter(<InCall />);
    await user.click(await screen.findByRole('button', { name: 'Keypad' }));
    await user.click(screen.getByRole('button', { name: 'Key 7' }));
    expect(adapter.sendDtmf).toHaveBeenCalledWith('7');
  });

  it('adjusts the output volume', async () => {
    renderInRouter(<InCall />);
    fireEvent.change(await screen.findByLabelText('Output volume'), {
      target: { value: '0.3' },
    });
    expect(useSoftphoneStore.getState().volume).toBe(0.3);
  });

  it('ends the call', async () => {
    const user = userEvent.setup();
    renderInRouter(<InCall />);
    await user.click(await screen.findByRole('button', { name: 'End call' }));
    expect(adapter.hangup).toHaveBeenCalledTimes(1);
    expect(useSoftphoneStore.getState().callState).toBe('idle');
  });
});
