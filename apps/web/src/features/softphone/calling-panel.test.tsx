// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nullSipAdapter, type SipAdapter } from './adapter';
import { CallingPanel } from './calling-panel';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';

function fakeAdapter(): SipAdapter {
  return { ...nullSipAdapter, hangup: vi.fn() };
}

let adapter: SipAdapter;
beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  adapter = fakeAdapter();
  useSoftphoneStore.getState().attachAdapter(adapter);
  useSoftphoneStore.setState({
    callState: 'calling',
    activeCall: { peer: 'agent-dev', direction: 'placed' },
  });
});

describe('CallingPanel', () => {
  it('shows the calling state and cancels the call', async () => {
    const user = userEvent.setup();
    render(<CallingPanel />);
    expect(screen.getByText('Calling')).toBeInTheDocument();
    expect(screen.getByText('agent-dev')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(adapter.hangup).toHaveBeenCalledTimes(1);
    expect(useSoftphoneStore.getState().callState).toBe('idle');
  });

  it('shows the ringing state', () => {
    useSoftphoneStore.setState({ callState: 'ringing' });
    render(<CallingPanel />);
    expect(screen.getByText('Ringing')).toBeInTheDocument();
  });
});
