// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CALL_EXAMPLE, TRUNK_EXAMPLE, type Call } from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';
import { renderAppAt, stubHealth } from '@/test/harness';

const C = vi.hoisted(() => ({
  useCalls: vi.fn(),
  useCall: vi.fn(),
  callKeys: { all: ['calls'] },
}));
vi.mock('@/features/calls/hooks', () => C);

const T = vi.hoisted(() => ({ useTrunks: vi.fn() }));
vi.mock('@/features/trunks/hooks', () => T);

const recorded: Call = {
  ...CALL_EXAMPLE,
  id: 'call_rec',
  recording: '/data/rec.wav',
  trunk_id: 'trunk_Zm9vYmFy',
};

const detail = {
  ...recorded,
  sip_trace: [
    {
      at: '2026-07-13T10:02:00.000Z',
      direction: 'incoming' as const,
      method: 'INVITE',
      summary: 'setup',
    },
  ],
};

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  stubHealth();
  C.useCalls.mockReturnValue({ isPending: false, isError: false, data: [] });
  C.useCall.mockReturnValue({ isPending: false, isError: false, data: detail });
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

describe('call log', () => {
  it('shows a loading state', async () => {
    C.useCalls.mockReturnValue({ isPending: true, isError: false });
    renderAppAt('/calls');
    expect(await screen.findByText('Loading calls…')).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    C.useCalls.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('down'),
    });
    renderAppAt('/calls');
    expect(await screen.findByText('down')).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    renderAppAt('/calls');
    expect(await screen.findByText(/No calls yet/)).toBeInTheDocument();
  });

  it('lists calls with recordings, failures, live rows and trunk resolution', async () => {
    const failed: Call = {
      ...CALL_EXAMPLE,
      id: 'call_fail',
      answered_at: null,
      ended_at: '2026-07-13T10:02:30.000Z',
      hangup_cause: 'busy',
      trunk_id: 'unknown_trunk',
      recording: null,
    };
    const live: Call = {
      ...CALL_EXAMPLE,
      id: 'call_live',
      state: 'ringing',
      answered_at: null,
      ended_at: null,
      trunk_id: null,
      recording: null,
    };
    C.useCalls.mockReturnValue({
      isPending: false,
      isError: false,
      data: [recorded, failed, live],
    });
    renderAppAt('/calls');
    expect(
      (await screen.findAllByRole('cell', { name: 'Received' })).length,
    ).toBe(3);
    expect(screen.getByRole('cell', { name: '0:42' })).toBeInTheDocument();
    // Failed call (never answered, ended): shows "failed"; live call shows a dash.
    expect(screen.getByRole('cell', { name: 'failed' })).toBeInTheDocument();
    // Matched trunk resolves to its name; unknown falls back to the id; null shows a dash.
    expect(screen.getByRole('cell', { name: 'agent-dev' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'unknown_trunk' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Call recording')).toBeInTheDocument();
  });

  it('falls back to the trunk id while trunks are loading', async () => {
    T.useTrunks.mockReturnValue({ isPending: true, isError: false });
    C.useCalls.mockReturnValue({
      isPending: false,
      isError: false,
      data: [recorded],
    });
    renderAppAt('/calls');
    expect(
      await screen.findByRole('cell', { name: 'trunk_Zm9vYmFy' }),
    ).toBeInTheDocument();
  });

  it('reads filters from the URL search params', async () => {
    renderAppAt('/calls?direction=received');
    await screen.findByText(/No calls yet/);
    expect(C.useCalls).toHaveBeenCalledWith({ direction: 'received' });
    expect(screen.getByLabelText('Direction')).toHaveValue('received');
  });

  it('writes every filter change back to the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderAppAt('/calls');
    await screen.findByText(/No calls yet/);

    await user.selectOptions(screen.getByLabelText('Direction'), 'placed');
    await user.selectOptions(screen.getByLabelText('Trunk'), 'trunk_Zm9vYmFy');
    await user.selectOptions(screen.getByLabelText('State'), 'ended');
    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: '2026-07-01' },
    });
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({
        from: '2026-07-01',
      });
    });
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: '2026-07-13' },
    });

    await waitFor(() => {
      expect(router.state.location.search).toEqual({
        direction: 'placed',
        trunk_id: 'trunk_Zm9vYmFy',
        state: 'ended',
        from: '2026-07-01',
        to: '2026-07-13',
      });
    });
  });
});

describe('call detail', () => {
  it('shows a loading state', async () => {
    C.useCall.mockReturnValue({ isPending: true, isError: false });
    renderAppAt('/calls/call_rec');
    expect(await screen.findByText('Loading call…')).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    C.useCall.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('no call'),
    });
    renderAppAt('/calls/call_rec');
    expect(await screen.findByText('no call')).toBeInTheDocument();
  });

  it('shows the timeline, ladder and recording', async () => {
    renderAppAt('/calls/call_rec');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Received' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Answered')).toBeInTheDocument();
    expect(screen.getByText('INVITE')).toBeInTheDocument();
    expect(screen.getByLabelText('Call recording')).toBeInTheDocument();
  });

  it('omits the recording section and dashes an unknown hangup cause', async () => {
    C.useCall.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        ...CALL_EXAMPLE,
        id: 'call_norec',
        hangup_cause: null,
        recording: null,
        sip_trace: [],
      },
    });
    renderAppAt('/calls/call_norec');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Received' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No SIP messages captured.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Call recording')).not.toBeInTheDocument();
  });
});
