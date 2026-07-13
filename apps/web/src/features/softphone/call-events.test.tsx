// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { renderHook } from '@testing-library/react';
import { CALL_EXAMPLE, type Call, type CallEvent } from '@switchboard/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';
import { applyCallEvent, useCallEventBridge } from './call-events';

const wsMock = vi.hoisted(() => ({ events: [] as CallEvent[] }));
vi.mock('@/lib/ws', () => ({ useCallEvents: () => wsMock.events }));

// An incoming call, from the softphone's point of view, is a data-model
// outbound call.
const incomingCall: Call = {
  ...CALL_EXAMPLE,
  id: 'call_in',
  direction: 'outbound',
  from_number: '+14155550123',
  trunk_id: 'trunk_1',
};

const placedCall: Call = {
  ...CALL_EXAMPLE,
  id: 'call_out',
  direction: 'inbound',
};

const event = (type: CallEvent['type'], call: Call): CallEvent =>
  ({ type, at: '2026-07-13T10:02:00.000Z', call }) as unknown as CallEvent;

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
});

describe('applyCallEvent', () => {
  it('queues an incoming card when a received call rings', () => {
    applyCallEvent(
      event('call.ringing', incomingCall),
      useSoftphoneStore.getState(),
    );
    expect(useSoftphoneStore.getState().incoming).toEqual([
      { id: 'call_in', from: '+14155550123', via: 'trunk_1' },
    ]);
  });

  it('falls back to "unknown" when a ringing call has no trunk', () => {
    applyCallEvent(
      event('call.ringing', { ...incomingCall, trunk_id: null }),
      useSoftphoneStore.getState(),
    );
    expect(useSoftphoneStore.getState().incoming[0]?.via).toBe('unknown');
  });

  it('does not duplicate an already-queued incoming call', () => {
    const ring = event('call.ringing', incomingCall);
    applyCallEvent(ring, useSoftphoneStore.getState());
    applyCallEvent(ring, useSoftphoneStore.getState());
    expect(useSoftphoneStore.getState().incoming).toHaveLength(1);
  });

  it('ignores a placed (inbound) call for the incoming notification', () => {
    applyCallEvent(
      event('call.ringing', placedCall),
      useSoftphoneStore.getState(),
    );
    expect(useSoftphoneStore.getState().incoming).toEqual([]);
  });

  it('records the negotiated codec on answered', () => {
    applyCallEvent(
      event('call.answered', { ...incomingCall, codec: 'opus' }),
      useSoftphoneStore.getState(),
    );
    expect(useSoftphoneStore.getState().codec).toBe('opus');
  });

  it('clears a still-ringing incoming card when the caller cancels', () => {
    applyCallEvent(
      event('call.ringing', incomingCall),
      useSoftphoneStore.getState(),
    );
    applyCallEvent(
      event('call.ended', incomingCall),
      useSoftphoneStore.getState(),
    );
    expect(useSoftphoneStore.getState().incoming).toEqual([]);
  });

  it('ignores other event types', () => {
    applyCallEvent(
      event('call.created', incomingCall),
      useSoftphoneStore.getState(),
    );
    expect(useSoftphoneStore.getState().incoming).toEqual([]);
  });

  it('links the server call id onto a placed (inbound) active call', () => {
    useSoftphoneStore.getState().placeCall('agent-dev');
    applyCallEvent(
      event('call.created', placedCall),
      useSoftphoneStore.getState(),
    );
    expect(useSoftphoneStore.getState().activeCall?.id).toBe('call_out');
  });

  it('does not link the call id onto an incoming (outbound) active call', () => {
    useSoftphoneStore.getState().placeCall('agent-dev');
    applyCallEvent(
      event('call.ringing', incomingCall),
      useSoftphoneStore.getState(),
    );
    expect(useSoftphoneStore.getState().activeCall?.id).toBeUndefined();
  });

  it('links the call id on a placed call that answers directly', () => {
    useSoftphoneStore.getState().placeCall('agent-dev');
    applyCallEvent(
      event('call.answered', placedCall),
      useSoftphoneStore.getState(),
    );
    expect(useSoftphoneStore.getState().activeCall?.id).toBe('call_out');
  });

  it('does not link the call id for other placed-call event types', () => {
    useSoftphoneStore.getState().placeCall('agent-dev');
    applyCallEvent(
      event('call.ended', placedCall),
      useSoftphoneStore.getState(),
    );
    expect(useSoftphoneStore.getState().activeCall?.id).toBeUndefined();
  });
});

describe('useCallEventBridge', () => {
  it('applies each new event exactly once', () => {
    wsMock.events = [];
    const { rerender } = renderHook(() => {
      useCallEventBridge();
    });
    expect(useSoftphoneStore.getState().incoming).toEqual([]);

    wsMock.events = [event('call.ringing', incomingCall)];
    rerender();
    expect(useSoftphoneStore.getState().incoming).toHaveLength(1);

    // A rerender with the same reference does not reprocess.
    rerender();
    expect(useSoftphoneStore.getState().incoming).toHaveLength(1);
  });
});
