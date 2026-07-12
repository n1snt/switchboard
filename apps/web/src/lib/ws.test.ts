// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { act, renderHook } from '@testing-library/react';
import { CALL_EXAMPLE, type CallEvent } from '@switchboard/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventsWsUrl, parseCallEvent, useCallEvents } from './ws';

const validEvent: CallEvent = {
  type: 'call.created',
  at: '2026-07-13T10:02:00.000Z',
  call: CALL_EXAMPLE,
};

describe('eventsWsUrl', () => {
  it('uses wss for an https origin', () => {
    expect(eventsWsUrl({ protocol: 'https:', host: 'app.test' })).toBe(
      'wss://app.test/api/v1/events',
    );
  });

  it('uses ws for a plain http origin', () => {
    expect(eventsWsUrl({ protocol: 'http:', host: 'localhost:5173' })).toBe(
      'ws://localhost:5173/api/v1/events',
    );
  });
});

describe('parseCallEvent', () => {
  it('parses a valid JSON string frame', () => {
    expect(parseCallEvent(JSON.stringify(validEvent))).toEqual(validEvent);
  });

  it('accepts an already-parsed object frame', () => {
    expect(parseCallEvent(validEvent)).toEqual(validEvent);
  });

  it('ignores a non-JSON string frame', () => {
    expect(parseCallEvent('{not json')).toBeNull();
  });

  it('ignores a JSON string that is not a call event', () => {
    expect(parseCallEvent(JSON.stringify({ type: 'nope' }))).toBeNull();
  });

  it('ignores a non-string, non-event value', () => {
    expect(parseCallEvent(42)).toBeNull();
  });
});

class FakeWebSocket {
  static last: FakeWebSocket | null = null;
  public onmessage: ((event: { data: unknown }) => void) | null = null;
  public readonly close = vi.fn();
  constructor(public readonly url: string) {
    FakeWebSocket.last = this;
  }
}

describe('useCallEvents', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeWebSocket.last = null;
  });

  it('opens the derived URL, collects valid events, and ignores bad frames', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const { result } = renderHook(() => useCallEvents());
    const socket = FakeWebSocket.last;
    expect(socket?.url).toBe(eventsWsUrl(window.location));
    expect(result.current).toEqual([]);

    act(() => {
      socket?.onmessage?.({ data: JSON.stringify(validEvent) });
    });
    expect(result.current).toEqual([validEvent]);

    act(() => {
      socket?.onmessage?.({ data: 'garbage' });
    });
    expect(result.current).toEqual([validEvent]);
  });

  it('closes the socket on unmount', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const { unmount } = renderHook(() => useCallEvents());
    const socket = FakeWebSocket.last;
    unmount();
    expect(socket?.close).toHaveBeenCalledTimes(1);
  });
});
