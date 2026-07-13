// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  nullSipAdapter,
  type IncomingCallInfo,
  type SipAdapter,
} from './adapter';
import { IncomingCall } from './incoming-call';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';

const call: IncomingCallInfo = {
  id: 'in-1',
  from: '+14155550123',
  via: 'carrier-sim',
};

let adapter: SipAdapter;
beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  adapter = { ...nullSipAdapter, answer: vi.fn(), decline: vi.fn() };
  useSoftphoneStore.getState().attachAdapter(adapter);
  useSoftphoneStore.setState({ incoming: [call] });
});

describe('IncomingCall', () => {
  it('shows the caller and the trunk it arrived on', () => {
    render(<IncomingCall call={call} />);
    expect(screen.getByText('+14155550123')).toBeInTheDocument();
    expect(screen.getByText('via carrier-sim')).toBeInTheDocument();
  });

  it('accepts a call', async () => {
    const user = userEvent.setup();
    render(<IncomingCall call={call} />);
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    expect(adapter.answer).toHaveBeenCalledWith('in-1');
    expect(useSoftphoneStore.getState().callState).toBe('in-call');
  });

  it('declines a call', async () => {
    const user = userEvent.setup();
    render(<IncomingCall call={call} />);
    await user.click(screen.getByRole('button', { name: 'Decline' }));
    expect(adapter.decline).toHaveBeenCalledWith('in-1');
    expect(useSoftphoneStore.getState().incoming).toEqual([]);
  });
});
